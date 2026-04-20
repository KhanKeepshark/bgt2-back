import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { CreateKeywordFilterInput } from './inputs/create-keyword-filter.input';
import { KeywordFilterModel } from './models/keyword-filter.model';

@Injectable()
export class KeywordFilterService {
  constructor(private readonly prismaService: PrismaService) {}

  public async createKeywordFilter(
    userId: string,
    input: CreateKeywordFilterInput,
  ): Promise<KeywordFilterModel> {
    const existing = await this.prismaService.keywordFilter.findUnique({
      where: {
        userId_phrase_type: {
          userId,
          phrase: input.phrase,
          type: input.type,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Keyword filter already exists');
    }

    return this.prismaService.keywordFilter.create({
      data: {
        userId,
        phrase: input.phrase,
        type: input.type,
      },
    });
  }

  public async getKeywordFilters(
    userId: string,
  ): Promise<KeywordFilterModel[]> {
    return this.prismaService.keywordFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async deleteKeywordFilter(
    userId: string,
    id: string,
  ): Promise<boolean> {
    const filter = await this.prismaService.keywordFilter.findUnique({
      where: { id },
    });

    if (!filter || filter.userId !== userId) {
      throw new BadRequestException('Keyword filter not found');
    }

    await this.prismaService.keywordFilter.delete({
      where: { id },
    });

    return true;
  }
}
