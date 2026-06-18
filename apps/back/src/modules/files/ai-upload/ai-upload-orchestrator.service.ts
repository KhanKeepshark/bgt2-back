import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { User } from '@prisma/generated';
import * as Upload from 'graphql-upload/Upload.js';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { streamToBuffer } from './utils/streamToBuffer';
import { parseToonResponse } from './utils/parseToonResponse';
import { AiUploadError } from '@back/shared/constants/errors.constants';
import { LimitGateService } from '@back/shared/limit-gate/limit-gate.service';
import { ClientProxy } from '@nestjs/microservices';
import { ProcessAiUploadJob } from './ai-upload.controller';
import { GeminiService } from '../../libs/gemini/gemini.service';
import { FileStorageService } from '../../libs/file-storage/file-storage.service';
import { CategoryMatcherService } from './services/category-matcher.service';

@Injectable()
export class AiUploadOrchestrator {
  private readonly logger = new Logger(AiUploadOrchestrator.name);

  constructor(
    private readonly prismaService: PrismaService,
    @Inject('AI_UPLOAD_SERVICE') private readonly rabbitClient: ClientProxy,
    private readonly geminiService: GeminiService,
    private readonly fileStorageService: FileStorageService,
    private readonly categoryMatcher: CategoryMatcherService,
    private readonly limitGate: LimitGateService,
  ) {}

  public async aiFileUpload(
    user: User,
    file: Upload,
  ): Promise<{ taskId: string; status: string; tokensBalance: number }> {
    let estimatedTokens = 0;

    try {
      const buffer = await streamToBuffer(file.createReadStream());

      // Получаем оценку токенов перед запросом
      estimatedTokens = await this.geminiService.countTokens(
        buffer,
        file.mimetype,
      );

      const tokensBalance = await this.limitGate.assertHasAiTokens(
        user.id,
        estimatedTokens,
      );

      // Сохраняем файл на диск
      const filePath = this.fileStorageService.saveTempFile(
        buffer,
        file.filename,
      );

      // Создаем задачу в БД
      const task = await this.prismaService.aiUploadTask.create({
        data: {
          userId: user.id,
          status: 'PENDING',
        },
      });

      // Отправляем задачу в RabbitMQ
      this.rabbitClient.emit('process_ai_upload', {
        taskId: task.id,
        userId: user.id,
        filePath,
        mimetype: file.mimetype,
        estimatedTokens,
      });

      return {
        taskId: task.id,
        status: task.status,
        tokensBalance,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Error initiating file upload: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(AiUploadError.PROCESS_FAILED);
    }
  }

  public async getAiUploadTask(user: User, taskId: string) {
    const task = await this.prismaService.aiUploadTask.findFirst({
      where: { id: taskId, userId: user.id },
    });
    if (!task) {
      throw new BadRequestException('Task not found');
    }

    const isTerminal = task.status === 'COMPLETED' || task.status === 'FAILED';
    let tokensBalance: number | undefined;

    if (isTerminal) {
      const currentUser = await this.prismaService.user.findUnique({
        where: { id: user.id },
        select: { tokensBalance: true },
      });
      tokensBalance = currentUser?.tokensBalance ?? 0;
    }

    return {
      taskId: task.id,
      status: task.status,
      operations: task.result ? (task.result as any) : null,
      error: task.error,
      tokensBalance,
    };
  }

  public async processAiUploadTask(data: ProcessAiUploadJob) {
    const { taskId, userId, filePath, mimetype, estimatedTokens } = data;
    let actualTokens = 0;
    let operationsCreated = 0;
    let tokensDebited = false;

    const claimed = await this.prismaService.aiUploadTask.updateMany({
      where: { id: taskId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    if (claimed.count === 0) {
      return;
    }

    try {
      await this.limitGate.debitAiTokens(userId, estimatedTokens);
      tokensDebited = true;

      const buffer = this.fileStorageService.readTempFile(filePath);
      const categories = await this.getUserCategories(userId);
      const deleteFilters = await this.prismaService.keywordFilter.findMany({
        where: { userId, type: 'DELETE' },
      });

      const { rawResult, actualTokens: tokensUsed } =
        await this.geminiService.generateContent(buffer, mimetype);
      actualTokens = tokensUsed;

      const extractedOperations = parseToonResponse(rawResult);

      const processedOperations = this.categoryMatcher.applyDeleteFilters(
        extractedOperations,
        deleteFilters,
      );

      operationsCreated = processedOperations.length;

      const canUseAutoCategory =
        await this.limitGate.canUseAutoCategory(userId);
      const refinedOperations = this.categoryMatcher.applyAutoCategories(
        processedOperations,
        categories,
        canUseAutoCategory,
      );

      await this.prismaService.$transaction(async (tx) => {
        await tx.aiTokenUsage.create({
          data: {
            userId,
            estimatedTokens,
            actualTokens,
            operationsCreated,
            fileType: mimetype,
            status: 'SUCCESS',
            error: null,
          },
        });

        await tx.aiUploadTask.update({
          where: { id: taskId },
          data: {
            status: 'COMPLETED',
            result: refinedOperations as any,
          },
        });
      });

      this.fileStorageService.deleteTempFile(filePath);
    } catch (error) {
      const errorMessage = error.message || 'Failed to process uploaded file.';
      this.logger.error(
        `Error processing file task ${taskId}: ${errorMessage}`,
        error.stack,
      );

      if (tokensDebited) {
        await this.logTokenUsage({
          userId,
          estimatedTokens,
          actualTokens,
          operationsCreated,
          fileType: mimetype,
          status: 'FAILED',
          error: errorMessage,
        }).catch((logError) => {
          this.logger.error(`Failed to log token usage: ${logError.message}`);
        });
      }

      await this.prismaService.aiUploadTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          error: errorMessage,
        },
      });

      this.fileStorageService.deleteTempFile(filePath);
    }
  }

  public async aiFileTokenCount(
    user: User,
    file: Upload,
  ): Promise<{ tokenCount: number }> {
    try {
      const buffer = await streamToBuffer(file.createReadStream());
      const tokenCount = await this.geminiService.countTokens(
        buffer,
        file.mimetype,
      );

      return { tokenCount };
    } catch (error) {
      this.logger.error(`Error counting tokens: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(AiUploadError.TOKEN_COUNT_FAILED);
    }
  }

  private async getUserCategories(userId: string) {
    const categories = await this.prismaService.category.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        type: true,
        icon: true,
        keywords: { select: { phrase: true } },
      },
    });

    if (categories.length === 0) {
      throw new BadRequestException(AiUploadError.NO_CATEGORIES);
    }
    return categories;
  }

  private async logTokenUsage(data: {
    userId: string;
    estimatedTokens: number;
    actualTokens: number;
    operationsCreated: number;
    fileType: string | null;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
  }) {
    try {
      await this.prismaService.aiTokenUsage.create({
        data: {
          userId: data.userId,
          estimatedTokens: data.estimatedTokens,
          actualTokens: data.actualTokens,
          operationsCreated: data.operationsCreated,
          fileType: data.fileType,
          status: data.status,
          error: data.error,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log AI token usage: ${error.message}`,
        error.stack,
      );
      // Не пробрасываем ошибку, чтобы не сломать основной процесс
    }
  }
}
