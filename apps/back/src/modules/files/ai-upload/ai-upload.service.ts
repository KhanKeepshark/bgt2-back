import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { User } from '@prisma/generated';
import * as Upload from 'graphql-upload/Upload.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { streamToBuffer } from './utils/streamToBuffer';
import { createFilePart } from './utils/createFilePart';
import { buildOptimizedPrompt } from './utils/buildOptimizedPrompt';
import { GoogleGenAI } from '@google/genai';
import { parseToonResponse } from './utils/parseToonResponse';
import { AiUploadError } from '@back/shared/constants/errors.constants';
import { ClientProxy } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProcessAiUploadJob } from './ai-upload.controller';

@Injectable()
export class AiUploadService {
  private readonly logger = new Logger(AiUploadService.name);
  private readonly genAI: GoogleGenAI;
  private readonly modelName = 'gemini-3.1-flash-lite-preview';

  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
    @Inject('AI_UPLOAD_SERVICE') private readonly rabbitClient: ClientProxy,
  ) {
    const geminiApiKey = configService.get<string>('GEMINI_API_KEY');
    if (!geminiApiKey) {
      this.logger.error('GEMINI_API_KEY is not defined in configuration');
    }
    this.genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  }

  public async aiFileUpload(
    user: User,
    file: Upload,
  ): Promise<{ taskId: string; status: string; tokensBalance: number }> {
    let estimatedTokens = 0;

    try {
      const buffer = await streamToBuffer(file.createReadStream());
      const filePart = createFilePart(buffer, file.mimetype);
      const prompt = buildOptimizedPrompt();

      // Получаем оценку токенов перед запросом
      try {
        const countResponse = await this.genAI.models.countTokens({
          model: this.modelName,
          contents: [filePart, prompt],
        });
        estimatedTokens = Math.ceil(countResponse.totalTokens * 2);
      } catch (countError) {
        this.logger.warn(`Failed to count tokens: ${countError.message}`);
        estimatedTokens = 10000;
      }

      // Проверяем баланс пользователя
      const freshUser = await this.prismaService.user.findUnique({
        where: { id: user.id },
        select: { tokensBalance: true },
      });

      if (!freshUser || freshUser.tokensBalance < estimatedTokens) {
        throw new BadRequestException(
          JSON.stringify({
            code: AiUploadError.INSUFFICIENT_TOKENS,
            params: {
              required: estimatedTokens,
              available: freshUser?.tokensBalance ?? 0,
            },
          }),
        );
      }

      // Сохраняем файл на диск
      const tempDir = path.join(process.cwd(), 'uploads', 'ai-temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const fileExt = file.filename.split('.').pop() || 'tmp';
      const filePath = path.join(tempDir, `${uuidv4()}.${fileExt}`);
      fs.writeFileSync(filePath, buffer);

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
        tokensBalance: freshUser.tokensBalance,
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

    return {
      taskId: task.id,
      status: task.status,
      operations: task.result ? (task.result as any) : null,
      error: task.error,
    };
  }

  public async processAiUploadTask(data: ProcessAiUploadJob) {
    const { taskId, userId, filePath, mimetype, estimatedTokens } = data;
    let actualTokens = 0;
    let operationsCreated = 0;

    try {
      await this.prismaService.aiUploadTask.update({
        where: { id: taskId },
        data: { status: 'PROCESSING' },
      });

      const buffer = fs.readFileSync(filePath);
      const categories = await this.getUserCategories(userId);
      const deleteFilters = await this.prismaService.keywordFilter.findMany({
        where: { userId, type: 'DELETE' },
      });

      const filePart = createFilePart(buffer, mimetype);
      const prompt = buildOptimizedPrompt();

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [filePart],
        config: {
          systemInstruction: prompt,
          temperature: 0,
        },
      });

      const rawResult = response.text;
      actualTokens = response.usageMetadata?.totalTokenCount || 0;

      const extractedOperations = parseToonResponse(rawResult);

      const processedOperations = extractedOperations.map((op) => {
        if (!op.description) return op;
        const desc = op.description.toLowerCase().trim();

        const isDeleted = deleteFilters.some((filter) =>
          desc.includes(filter.phrase.toLowerCase().trim()),
        );

        if (isDeleted) {
          return { ...op, isDeleted: true };
        }

        return op;
      });

      operationsCreated = processedOperations.length;

      const userWithPlan = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { subscriptionPlan: true },
      });

      const refinedOperations = userWithPlan?.subscriptionPlan
        ?.canUseAutoCategory
        ? processedOperations.map((op) => {
            if (op.description && op.type !== 'TRANSFER' && !op.isDeleted) {
              const autoCategory = this.findCategoryByKeywords(
                op.description,
                op.type as 'INCOME' | 'EXPENSE',
                categories,
              );
              if (autoCategory) {
                return {
                  ...op,
                  categoryName: autoCategory.name,
                  categoryIcon: autoCategory.icon,
                };
              }
            }
            return op;
          })
        : processedOperations;

      await this.prismaService.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            tokensBalance: {
              decrement: estimatedTokens,
            },
          },
        });

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

      // Cleanup
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to process uploaded file.';
      this.logger.error(
        `Error processing file task ${taskId}: ${errorMessage}`,
        error.stack,
      );

      if (actualTokens > 0 && estimatedTokens > 0) {
        try {
          await this.prismaService.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: userId },
              data: { tokensBalance: { decrement: estimatedTokens } },
            });

            await tx.aiTokenUsage.create({
              data: {
                userId,
                estimatedTokens,
                actualTokens,
                operationsCreated,
                fileType: mimetype,
                status: 'FAILED',
                error: errorMessage,
              },
            });
          });
        } catch (logError) {
          this.logger.error(
            `Failed to charge/log failed usage: ${logError.message}`,
          );
        }
      } else {
        await this.logTokenUsage({
          userId,
          estimatedTokens,
          actualTokens: 0,
          operationsCreated: 0,
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

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  public async aiFileTokenCount(
    user: User,
    file: Upload,
  ): Promise<{ tokenCount: number }> {
    try {
      const buffer = await streamToBuffer(file.createReadStream());

      const filePart = createFilePart(buffer, file.mimetype);
      const prompt = buildOptimizedPrompt();

      const countResponse = await this.genAI.models.countTokens({
        model: this.modelName,
        contents: [filePart, prompt],
      });

      return {
        tokenCount: Math.ceil(countResponse.totalTokens * 2),
      };
    } catch (error) {
      this.logger.error(`Error counting tokens: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(AiUploadError.TOKEN_COUNT_FAILED);
    }
  }

  private findCategoryByKeywords(
    description: string,
    type: 'INCOME' | 'EXPENSE',
    categories: Array<{
      name: string;
      type: string;
      icon: string;
      keywords: Array<{ phrase: string }>;
    }>,
  ): { name: string; icon: string } | null {
    const normalizedDescription = description.toLowerCase().trim();

    for (const category of categories) {
      if (category.type !== type) continue;

      for (const keyword of category.keywords) {
        const normalizedKeyword = keyword.phrase.toLowerCase().trim();
        if (
          normalizedKeyword &&
          normalizedDescription.includes(normalizedKeyword)
        ) {
          return { name: category.name, icon: category.icon };
        }
      }
    }

    return null;
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
