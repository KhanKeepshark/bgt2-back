import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { buildOptimizedPrompt } from './utils/buildOptimizedPrompt';
import { createFilePart } from './utils/createFilePart';
import { createTextPart } from './utils/createTextPart';

export interface GenerateContentOptions {
  extractedText?: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenAI;
  private readonly modelName = 'gemini-3.1-flash-lite-preview';

  constructor(private readonly configService: ConfigService) {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!geminiApiKey) {
      this.logger.error('GEMINI_API_KEY is not defined in configuration');
    }
    this.genAI = new GoogleGenAI({ apiKey: geminiApiKey || '' });
  }

  public async countTokens(buffer: Buffer, mimetype: string): Promise<number> {
    try {
      const filePart = createFilePart(buffer, mimetype);
      const prompt = buildOptimizedPrompt();

      const countResponse = await this.genAI.models.countTokens({
        model: this.modelName,
        contents: [filePart, prompt],
      });
      return Math.ceil((countResponse.totalTokens || 0) * 2);
    } catch (error) {
      this.logger.warn(`Failed to count tokens: ${error.message}`);
      return 10000; // Fallback estimate
    }
  }

  public async generateContent(
    buffer: Buffer,
    mimetype: string,
    options: GenerateContentOptions = {},
  ): Promise<{ rawResult: string; actualTokens: number }> {
    const prompt = buildOptimizedPrompt();
    const contentPart = options.extractedText
      ? createTextPart(
          `Extract financial operations from this PDF text:\n\n${options.extractedText}`,
        )
      : createFilePart(buffer, mimetype);

    const response = await this.genAI.models.generateContent({
      model: this.modelName,
      contents: [contentPart],
      config: {
        systemInstruction: prompt,
        temperature: 0,
      },
    });

    return {
      rawResult: response.text || '',
      actualTokens: response.usageMetadata?.totalTokenCount || 0,
    };
  }
}
