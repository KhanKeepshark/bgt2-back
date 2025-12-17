import { Injectable, BadRequestException } from '@nestjs/common';
import { User } from '@prisma/generated';
import * as Upload from 'graphql-upload/Upload.js';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { streamToBuffer } from './utils/streamToBuffer';
import { createFilePart } from './utils/createFilePart';
import { buildOptimizedPrompt } from './utils/buildOptimizedPrompt';
import { ExtractedOperation } from '@back/shared/types/ai-operations';

@Injectable()
export class AiUploadService {
  private readonly ai: GoogleGenAI;

  constructor(
    configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    const geminiApiKey = configService.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({apiKey: geminiApiKey}); 
  }

  public async aiFileUpload(
    user: User, 
    file: Upload,
  ): Promise<{ operations: ExtractedOperation[] }> {
    try {      
      const buffer = await streamToBuffer(file.createReadStream());

      // Получаем категории пользователя
      const categories = await this.prismaService.category.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      if (categories.length === 0) {
        throw new BadRequestException('No categories found. Please create categories first.');
      }

      const filePart = createFilePart(buffer, file.mimetype);
      const prompt = buildOptimizedPrompt(categories);

        // TODO: return when added premium plan
        // const countResponse = await this.ai.models.countTokens({
        //     model: 'gemini-2.5-flash', 
        //     contents: [
        //         filePart,         
        //         { text: prompt }, 
        //     ],
        // });

    //   const response = await this.ai.models.generateContent({
    //     model: 'gemini-2.5-flash',
    //     contents: [
    //       filePart,
    //       { text: prompt },
    //     ],
    //   });

    //   console.log("response", response);
    //   const usage = response.usageMetadata
    //   console.log("usage", usage);
    //   const rawResult = response.text;
    //   console.log("AI Response:", rawResult);

    //   // Парсим ответ AI в компактном формате
    //   const extractedOperations = this.parseToonResponse(rawResult);

    //   // Сохраняем extractedOperations в локальный файл
    //   const savedFilePath = await this.saveExtractedOperations(
    //     extractedOperations,
    //     user.id,
    //     originalFilename,
    //   );
    //   if (savedFilePath) {
    //     console.log(`Extracted operations saved to: ${savedFilePath}`);
    //   }

      // Создаем операции
      const responceJson = require('./const/extracted-1763709433756-73a5a4c7-abbb-4ccf-bc08-6f53c341d5e9-f47528de.json');
      const createdOperations = responceJson.extractedOperations as ExtractedOperation[];

      return {
        operations: createdOperations,
      };
    } catch (error) {
      console.error("Error processing file:", error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to process uploaded file.');
    }
  }

  public async aiFileTokenCount(
    user: User,
    file: Upload,
  ): Promise<{ tokenCount: number }> {
    try {
      const buffer = await streamToBuffer(file.createReadStream());

      const categories = await this.prismaService.category.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      if (categories.length === 0) {
        throw new BadRequestException('No categories found. Please create categories first.');
      }

      const filePart = createFilePart(buffer, file.mimetype);
      const prompt = buildOptimizedPrompt(categories);

      const countResponse = await this.ai.models.countTokens({
          model: 'gemini-2.5-flash', 
          contents: [
              filePart,         
              { text: prompt }, 
          ],
      });

      return {
        tokenCount: countResponse.totalTokens,
      };
    } catch (error) {
      throw new BadRequestException('Failed to process uploaded file.');
    }
  }
}

