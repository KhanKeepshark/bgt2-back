import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryInput } from './inputs/create-category.input';
import { Category, User } from '@/prisma/generated';
import { PrismaService } from '@/src/core/prisma/prisma.service';
import { UpdateCategoryInput } from './inputs/update-category.input';

@Injectable()
export class CategoryService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(
    input: CreateCategoryInput,
    user: User,
  ): Promise<Category> {
    try {
      const existingCategory = await this.prismaService.category.findFirst({
        where: { name: input.name, userId: user.id },
      });

      if (existingCategory) {
        throw new BadRequestException('Category with this name already exists');
      }

      if (input.parentId) {
        const parentCategory = await this.prismaService.category.findFirst({
          where: { id: input.parentId, userId: user.id },
        });

        if (!parentCategory || parentCategory.parentId !== null) {
          throw new BadRequestException(
            'Parent category not found or access denied',
          );
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
        throw new BadRequestException('Failed to create category');
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
        },
        orderBy: { createdAt: 'desc' },
      });

      return categories;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find categories');
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
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return category;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find category');
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
          throw new BadRequestException(
            'Category with this name already exists',
          );
        }
      }

      if (input.parentId) {
        const parentCategory = await this.prismaService.category.findFirst({
          where: { id: input.parentId, userId: user.id },
        });

        if (!parentCategory) {
          throw new BadRequestException(
            'Parent category not found or access denied',
          );
        }

        if (input.parentId === input.id) {
          throw new BadRequestException('Category cannot be its own parent');
        }
      }

      const updated = await this.prismaService.category.update({
        where: { id: input.id, userId: user.id },
        data: input,
        include: {
          parent: true,
          children: true,
        },
      });

      return updated;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to update category');
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
        throw new BadRequestException(
          'Cannot delete category with subcategories',
        );
      }

      const result = await this.prismaService.category.delete({
        where: { id, userId: user.id },
      });

      return !!result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to delete category');
      }

      throw error;
    }
  }

  public async findByType(type: string, user: User): Promise<Category[]> {
    try {
      const categories = await this.prismaService.category.findMany({
        where: {
          type: type as any,
          userId: user.id,
        },
        include: {
          parent: true,
          children: true,
        },
        orderBy: { name: 'asc' },
      });

      return categories;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find categories');
      }

      throw error;
    }
  }
}
