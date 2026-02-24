import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { User } from '@prisma/generated';
import * as Upload from 'graphql-upload/Upload.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { streamToBuffer } from './utils/streamToBuffer';
import { createFilePart } from './utils/createFilePart';
import { buildOptimizedPrompt } from './utils/buildOptimizedPrompt';
import { ExtractedOperation } from '@back/shared/types/ai-operations';
import { GoogleGenAI } from '@google/genai';
import { parseToonResponse } from './utils/parseToonResponse';

@Injectable()
export class AiUploadService {
  private readonly logger = new Logger(AiUploadService.name);
  private readonly genAI: GoogleGenAI;
  private readonly modelName = 'gemini-2.5-flash-lite';

  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
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
  ): Promise<{ operations: ExtractedOperation[] }> {
    let estimatedTokens = 0;
    let actualTokens = 0;
    let operationsCreated = 0;

    try {      
      const buffer = await streamToBuffer(file.createReadStream());
      const categories = await this.getUserCategories(user.id);

      const filePart = createFilePart(buffer, file.mimetype);
      const prompt = buildOptimizedPrompt(categories);

      // Получаем оценку токенов перед запросом
      try {
        const countResponse = await this.genAI.models.countTokens({
          model: this.modelName,
          contents: [filePart, prompt],
        });
        estimatedTokens = countResponse.totalTokens * 5; // Умножаем на 5 как в aiFileTokenCount
      } catch (countError) {
        this.logger.warn(`Failed to count tokens: ${countError.message}`);
        // Продолжаем без оценки токенов, но установим дефолтное значение для проверки баланса
        estimatedTokens = 100000; 
      }

      // Проверяем баланс пользователя
      const freshUser = await this.prismaService.user.findUnique({
        where: { id: user.id },
        select: { tokensBalance: true },
      });

      if (!freshUser || freshUser.tokensBalance < estimatedTokens) {
        throw new BadRequestException(
          `Insufficient tokens. Required: ~${estimatedTokens}, Available: ${freshUser?.tokensBalance || 0}`,
        );
      }

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [filePart, prompt],
      });
      
      const rawResult = response.text;
      actualTokens = response.usageMetadata?.totalTokenCount || 0;

      // Списываем токены
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          tokensBalance: {
            decrement: actualTokens,
          },
        },
      });

      this.logger.debug(`AI Response: ${rawResult}`);
      this.logger.debug(`Token usage - Estimated: ${estimatedTokens}, Actual: ${actualTokens}`);

      const extractedOperations = parseToonResponse(rawResult);
      operationsCreated = extractedOperations.length;

      const userWithPlan = await this.prismaService.user.findUnique({
        where: { id: user.id },
        include: { subscriptionPlan: true },
      });

      const refinedOperations =
        userWithPlan?.subscriptionPlan.canUseAutoCategory
          ? extractedOperations.map((op) => {
              if (op.description && op.type !== 'TRANSFER') {
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
          : extractedOperations;

      // Логируем успешное использование токенов
      await this.logTokenUsage({
        userId: user.id,
        estimatedTokens,
        actualTokens,
        operationsCreated,
        fileType: file.mimetype,
        status: 'SUCCESS',
      });

      return {
        operations: refinedOperations,
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to process uploaded file.';
      this.logger.error(`Error processing file: ${errorMessage}`, error.stack);

      // Логируем неудачное использование токенов
      await this.logTokenUsage({
        userId: user.id,
        estimatedTokens,
        actualTokens,
        operationsCreated,
        fileType: file.mimetype,
        status: 'FAILED',
        error: errorMessage,
      }).catch((logError) => {
        this.logger.error(`Failed to log token usage: ${logError.message}`);
      });

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  public async aiFileTokenCount(
    user: User,
    file: Upload,
  ): Promise<{ tokenCount: number }> {
    try {
      const buffer = await streamToBuffer(file.createReadStream());
      const categories = await this.getUserCategories(user.id);

      const filePart = createFilePart(buffer, file.mimetype);
      const prompt = buildOptimizedPrompt(categories);

      const countResponse = await this.genAI.models.countTokens({
        model: this.modelName,
        contents: [filePart, prompt],
      });

      return {
        tokenCount: countResponse.totalTokens * 5,
      };
    } catch (error) {
      this.logger.error(`Error counting tokens: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to count tokens.');
    }
  }

  private findCategoryByKeywords(
    description: string,
    type: 'INCOME' | 'EXPENSE',
    categories: Array<{ name: string; type: string; icon: string; keywords: Array<{ phrase: string }> }>,
  ): { name: string; icon: string } | null {
    const normalizedDescription = description.toLowerCase().trim();

    for (const category of categories) {
      if (category.type !== type) continue;

      for (const keyword of category.keywords) {
        const normalizedKeyword = keyword.phrase.toLowerCase().trim();
        if (normalizedKeyword && normalizedDescription.includes(normalizedKeyword)) {
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
      throw new BadRequestException('No categories found.');
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
      this.logger.error(`Failed to log AI token usage: ${error.message}`, error.stack);
      // Не пробрасываем ошибку, чтобы не сломать основной процесс
    }
  }
}
