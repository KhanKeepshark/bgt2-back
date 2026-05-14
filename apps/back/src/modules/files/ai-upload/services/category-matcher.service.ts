import { Injectable } from '@nestjs/common';

export interface CategoryData {
  name: string;
  type: string;
  icon: string;
  keywords: Array<{ phrase: string }>;
}

export interface KeywordFilterData {
  phrase: string;
}

@Injectable()
export class CategoryMatcherService {
  public applyDeleteFilters<
    T extends { description?: string; isDeleted?: boolean },
  >(operations: T[], deleteFilters: KeywordFilterData[]): T[] {
    return operations.map((op) => {
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
  }

  public applyAutoCategories<
    T extends {
      description?: string;
      type?: string;
      isDeleted?: boolean;
      categoryName?: string;
      categoryIcon?: string;
    },
  >(
    operations: T[],
    categories: CategoryData[],
    canUseAutoCategory: boolean,
  ): T[] {
    if (!canUseAutoCategory) {
      return operations;
    }

    return operations.map((op) => {
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
    });
  }

  private findCategoryByKeywords(
    description: string,
    type: 'INCOME' | 'EXPENSE',
    categories: CategoryData[],
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
}
