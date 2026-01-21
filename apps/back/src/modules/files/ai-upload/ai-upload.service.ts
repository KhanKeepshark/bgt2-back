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
    try {      
      const buffer = await streamToBuffer(file.createReadStream());
      const categories = await this.getUserCategories(user.id);

      const filePart = createFilePart(buffer, file.mimetype);
      const prompt = buildOptimizedPrompt(categories);

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [filePart, prompt],
      });
      
      const rawResult = response.text;

      // TODO: use only for debug
      // console.log(`Usage: ${response.usageMetadata}`);
      // this.logger.debug(`AI Response: ${rawResult}`);
       

      const extractedOperations = parseToonResponse(rawResult);

      const refinedOperations = extractedOperations.map(op => {
        if (op.description && op.type !== 'TRANSFER') {
          const autoCategory = this.findCategoryByKeywords(
            op.description,
            op.type as 'INCOME' | 'EXPENSE',
            categories,
          );
          if (autoCategory) {
            return { ...op, categoryName: autoCategory.name, categoryIcon: autoCategory.icon };
          }
        }
        return op;
      });

      return {
        operations: refinedOperations,
      };
    } catch (error) {
      this.logger.error(`Error processing file: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Failed to process uploaded file.');
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
        tokenCount: countResponse.totalTokens,
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
}
