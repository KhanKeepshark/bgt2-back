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
import { AiUploadError } from '@back/shared/constants/errors.constants';

@Injectable()
export class AiUploadService {
  private readonly logger = new Logger(AiUploadService.name);
  private readonly genAI: GoogleGenAI;
  private readonly modelName = 'gemini-3.1-flash-lite-preview';

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
  ): Promise<{ operations: ExtractedOperation[], tokensBalance: number }> {
    let estimatedTokens = 0;
    let actualTokens = 0;
    let operationsCreated = 0;

    try {      
      const buffer = await streamToBuffer(file.createReadStream());
      const categories = await this.getUserCategories(user.id);

      const filePart = createFilePart(buffer, file.mimetype);
      const prompt = buildOptimizedPrompt(categories);

      this.logger.debug(`Prompt: ${prompt}`);

      // Получаем оценку токенов перед запросом
      try {
        const countResponse = await this.genAI.models.countTokens({
          model: this.modelName,
          contents: [filePart, prompt],
        });
        // Умножаем на 2 для безопасности (input + output)
        estimatedTokens = Math.ceil(countResponse.totalTokens * 2); 
      } catch (countError) {
        this.logger.warn(`Failed to count tokens: ${countError.message}`);
        // Продолжаем без оценки токенов, но установим дефолтное значение для проверки баланса
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

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [filePart, prompt],
      });
      
      const rawResult = response.text;
      actualTokens = response.usageMetadata?.totalTokenCount || 0;

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

      // Транзакция: списание и логирование (списываем estimatedTokens)
      const updatedUser = await this.prismaService.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: user.id },
          data: {
            tokensBalance: {
              decrement: estimatedTokens,
            },
          },
          select: { tokensBalance: true },
        });

        await tx.aiTokenUsage.create({
          data: {
            userId: user.id,
            estimatedTokens,
            actualTokens,
            operationsCreated,
            fileType: file.mimetype,
            status: 'SUCCESS',
            error: null,
          },
        });
        
        return updated;
      });

      return {
        operations: refinedOperations,
        tokensBalance: updatedUser.tokensBalance,
      };
    } catch (error) {
      const errorMessage = error.message || 'Failed to process uploaded file.';
      this.logger.error(`Error processing file: ${errorMessage}`, error.stack);

      // Если токены были потрачены (был выполнен AI-запрос), списываем estimatedTokens и логируем ошибку
      if (actualTokens > 0 && estimatedTokens > 0) {
        try {
            await this.prismaService.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: user.id },
                    data: { tokensBalance: { decrement: estimatedTokens } },
                });

                await tx.aiTokenUsage.create({
                    data: {
                        userId: user.id,
                        estimatedTokens,
                        actualTokens,
                        operationsCreated,
                        fileType: file.mimetype,
                        status: 'FAILED',
                        error: errorMessage,
                    }
                });
            });
        } catch (logError) {
            this.logger.error(`Failed to charge/log failed usage: ${logError.message}`);
        }
      } else {
          // Логируем неудачную попытку без списания
          await this.logTokenUsage({
            userId: user.id,
            estimatedTokens,
            actualTokens: 0,
            operationsCreated: 0,
            fileType: file.mimetype,
            status: 'FAILED',
            error: errorMessage,
          }).catch((logError) => {
            this.logger.error(`Failed to log token usage: ${logError.message}`);
          });
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(AiUploadError.PROCESS_FAILED);
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
      this.logger.error(`Failed to log AI token usage: ${error.message}`, error.stack);
      // Не пробрасываем ошибку, чтобы не сломать основной процесс
    }
  }
}
