import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryInput } from './inputs/create-category.input';
import {
  Category,
  CategoryKeyword,
  CategoryType,
  User,
} from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { UpdateCategoryInput } from './inputs/update-category.input';
import { getDefaultCategories } from './const/defaultCategories';
import { CreateCategoryKeywordInput } from './inputs/create-category-keyword.input';
import { UpdateCategoryKeywordInput } from './inputs/update-category-keyword.input';
import {
  CategoryError,
} from '@back/shared/constants/errors.constants';
import { LimitGateService } from '@back/shared/limit-gate/limit-gate.service';

@Injectable()
export class CategoryService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly limitGate: LimitGateService,
  ) {}

  public async create(
    input: CreateCategoryInput,
    user: User,
  ): Promise<Category> {
    try {
      const existingCategory = await this.prismaService.category.findFirst({
        where: { name: input.name, userId: user.id },
      });

      if (existingCategory) {
        throw new BadRequestException(CategoryError.ALREADY_EXISTS);
      }

      await this.limitGate.assertCanCreateCategory(user.id);

      if (input.parentId) {
        const parentCategory = await this.prismaService.category.findFirst({
          where: { id: input.parentId, userId: user.id },
        });

        if (!parentCategory || parentCategory.parentId !== null) {
          throw new BadRequestException(CategoryError.NOT_FOUND);
        }

        if (parentCategory.type !== input.type) {
          throw new BadRequestException(
            'Parent category type does not match the category type',
          );
        }
      }

      const created = await this.prismaService.category.create({
        data: {
          name: input.name,
          type: input.type,
          color: input.color,
          icon: input.icon,
          user: { connect: { id: user.id } },
          parent: input.parentId
            ? { connect: { id: input.parentId } }
            : undefined,
        },
        include: {
          parent: true,
          children: true,
        },
      });

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(CategoryError.CREATION_FAILED);
      }

      throw error;
    }
  }

  public async createDefault(user: User, language?: string): Promise<void> {
    try {
      const categories = getDefaultCategories(language);
      await Promise.all(
        categories.map((category) =>
          this.prismaService.category.create({
            data: {
              name: category.name,
              icon: category.icon,
              user: {
                connect: { id: user.id },
              },
              type: category.type,
            },
          }),
        ),
      );
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(CategoryError.CREATION_FAILED);
      }

      throw error;
    }
  }

  public async findAll(user: User): Promise<Category[]> {
    try {
      const categories = await this.prismaService.category.findMany({
        where: { userId: user.id },
        include: {
          parent: true,
          children: true,
          keywords: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return categories;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(CategoryError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async findOne(id: string, user: User): Promise<Category> {
    try {
      const category = await this.prismaService.category.findFirst({
        where: { id, userId: user.id },
        include: {
          parent: true,
          children: true,
          keywords: true,
        },
      });

      if (!category) {
        throw new NotFoundException(CategoryError.NOT_FOUND);
      }

      return category;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(CategoryError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async update(
    input: UpdateCategoryInput,
    user: User,
  ): Promise<Category> {
    try {
      if (input.name) {
        const existingCategory = await this.prismaService.category.findFirst({
          where: {
            name: input.name,
            userId: user.id,
            id: { not: input.id },
          },
        });

        if (existingCategory) {
          throw new BadRequestException(CategoryError.ALREADY_EXISTS);
        }
      }

      if (input.parentId) {
        const parentCategory = await this.prismaService.category.findFirst({
          where: { id: input.parentId, userId: user.id },
        });

        if (!parentCategory) {
          throw new BadRequestException(CategoryError.NOT_FOUND);
        }

        if (input.parentId === input.id) {
          throw new BadRequestException(CategoryError.SELF_PARENT);
        }
      }

      const updated = await this.prismaService.category.update({
        where: { id: input.id, userId: user.id },
        data: input,
        include: {
          parent: true,
          children: true,
          keywords: true,
        },
      });

      return updated;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(CategoryError.UPDATE_FAILED);
      }

      throw error;
    }
  }

  public async delete(id: string, user: User): Promise<boolean> {
    try {
      const category = await this.prismaService.category.findFirst({
        where: { id, userId: user.id },
        include: {
          children: true,
        },
      });

      if (category.children && category.children.length > 0) {
        throw new BadRequestException(CategoryError.DELETION_FAILED);
      }

      const result = await this.prismaService.category.delete({
        where: { id, userId: user.id },
      });

      return !!result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(CategoryError.DELETION_FAILED);
      }

      throw error;
    }
  }

  public async findByType(type: CategoryType, user: User): Promise<Category[]> {
    try {
      const categories = await this.prismaService.category.findMany({
        where: {
          type: type,
          userId: user.id,
        },
        include: {
          parent: true,
          children: true,
          keywords: true,
        },
        orderBy: { name: 'asc' },
      });

      return categories;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(CategoryError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async createKeyword(
    input: CreateCategoryKeywordInput,
    user: User,
  ): Promise<CategoryKeyword> {
    try {
      const category = await this.prismaService.category.findFirst({
        where: { id: input.categoryId, userId: user.id },
      });

      if (!category) {
        throw new NotFoundException(CategoryError.NOT_FOUND);
      }

      await this.limitGate.assertCanCreateCategoryKeyword(
        user.id,
        input.categoryId,
      );

      return await this.prismaService.categoryKeyword.create({
        data: {
          phrase: input.phrase,
          categoryId: input.categoryId,
          userId: user.id,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(CategoryError.KEYWORD_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  public async updateKeyword(
    input: UpdateCategoryKeywordInput,
    user: User,
  ): Promise<CategoryKeyword> {
    try {
      const keyword = await this.prismaService.categoryKeyword.findFirst({
        where: { id: input.id, userId: user.id },
      });

      if (!keyword) {
        throw new NotFoundException(CategoryError.NOT_FOUND);
      }

      if (input.categoryId) {
        const category = await this.prismaService.category.findFirst({
          where: { id: input.categoryId, userId: user.id },
        });
        if (!category) {
          throw new NotFoundException(CategoryError.NOT_FOUND);
        }

        if (input.categoryId !== keyword.categoryId) {
          await this.limitGate.assertCanCreateCategoryKeyword(
            user.id,
            input.categoryId,
          );
        }
      }

      return await this.prismaService.categoryKeyword.update({
        where: { id: input.id },
        data: {
          phrase: input.phrase,
          categoryId: input.categoryId,
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(CategoryError.KEYWORD_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  public async deleteKeyword(id: string, user: User): Promise<boolean> {
    const result = await this.prismaService.categoryKeyword.deleteMany({
      where: { id, userId: user.id },
    });

    return result.count > 0;
  }

  public async hasOperations(id: string, user: User): Promise<boolean> {
    const operationsCount = await this.prismaService.operation.count({
      where: {
        categoryId: id,
        userId: user.id,
      },
    });

    const recurrencesCount = await this.prismaService.recurrenceConfig.count({
      where: {
        categoryId: id,
        userId: user.id,
      },
    });

    return operationsCount > 0 || recurrencesCount > 0;
  }
}
