import { Injectable, Scope } from '@nestjs/common';
import * as DataLoader from 'dataloader';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { Category, Account, Tag } from '@prisma/generated';

@Injectable({ scope: Scope.REQUEST })
export class OperationDataLoader {
  constructor(private readonly prismaService: PrismaService) {}

  public readonly categoryLoader = new DataLoader<string, Category | null>(
    async (categoryIds) => {
      const categories = await this.prismaService.category.findMany({
        where: { id: { in: [...categoryIds] } },
        include: { keywords: true, children: true },
      });
      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      return categoryIds.map((id) => categoryMap.get(id) || null);
    },
  );

  public readonly accountLoader = new DataLoader<string, Account | null>(
    async (accountIds) => {
      const accounts = await this.prismaService.account.findMany({
        where: { id: { in: [...accountIds] } },
      });
      const accountMap = new Map(accounts.map((a) => [a.id, a]));
      return accountIds.map((id) => accountMap.get(id) || null);
    },
  );

  public readonly tagsLoader = new DataLoader<string, Tag[]>(
    async (operationIds) => {
      const operationsWithTags = await this.prismaService.operation.findMany({
        where: { id: { in: [...operationIds] } },
        include: { tags: true },
      });
      const tagsMap = new Map(operationsWithTags.map((op) => [op.id, op.tags]));
      return operationIds.map((id) => tagsMap.get(id) || []);
    },
  );
}
