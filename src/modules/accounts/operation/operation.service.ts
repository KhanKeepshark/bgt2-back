import { PrismaService } from '@/src/core/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOperationInput } from './inputs/create-operation.input';
import { Operation, User } from '@/prisma/generated';
import { UpdateOperationInput } from './inputs/update-operation.input';

@Injectable()
export class OperationService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(
    input: CreateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      const account = await this.prismaService.account.findFirst({
        where: { id: input.accountId, userId: user.id },
      });

      if (!account) {
        throw new BadRequestException('Account not found or access denied');
      }

      const category = await this.prismaService.category.findFirst({
        where: { id: input.categoryId, userId: user.id },
      });

      if (!category) {
        throw new BadRequestException('Category not found or access denied');
      }

      if (input.tags && input.tags.length > 0) {
        const tags = await this.prismaService.tag.findMany({
          where: {
            id: { in: input.tags },
            userId: user.id,
          },
        });

        if (tags.length !== input.tags.length) {
          throw new BadRequestException('Some tags not found or access denied');
        }
      }

      const created = await this.prismaService.operation.create({
        data: {
          amount: input.amount,
          date: input.date,
          description: input.description,
          type: input.type,
          category: {
            connect: { id: input.categoryId },
          },
          account: {
            connect: { id: input.accountId },
          },
          tags: input.tags
            ? {
                connect: input.tags.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          category: true,
          account: true,
          tags: true,
        },
      });

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to create operation');
      }

      throw error;
    }
  }

  public async findAll(user: User): Promise<Operation[]> {
    try {
      const operations = await this.prismaService.operation.findMany({
        where: {
          account: { userId: user.id },
        },
        include: {
          category: true,
          account: true,
          tags: true,
        },
        orderBy: { date: 'desc' },
      });

      return operations;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find operations');
      }

      throw error;
    }
  }

  public async findOne(id: string, user: User): Promise<Operation> {
    try {
      const operation = await this.prismaService.operation.findFirst({
        where: {
          id,
          account: { userId: user.id },
        },
        include: {
          category: true,
          account: true,
          tags: true,
        },
      });

      if (!operation) {
        throw new NotFoundException('Operation not found');
      }

      return operation;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find operation');
      }

      throw error;
    }
  }

  public async update(
    input: UpdateOperationInput,
    user: User,
  ): Promise<Operation> {
    try {
      await this.findOne(input.id, user);

      if (input.accountId) {
        const account = await this.prismaService.account.findFirst({
          where: { id: input.accountId, userId: user.id },
        });

        if (!account) {
          throw new BadRequestException('Account not found or access denied');
        }
      }

      if (input.categoryId) {
        const category = await this.prismaService.category.findFirst({
          where: { id: input.categoryId, userId: user.id },
        });

        if (!category) {
          throw new BadRequestException('Category not found or access denied');
        }
      }

      if (input.tags) {
        const tags = await this.prismaService.tag.findMany({
          where: {
            id: { in: input.tags },
            userId: user.id,
          },
        });

        if (tags.length !== input.tags.length) {
          throw new BadRequestException('Some tags not found or access denied');
        }
      }

      const updated = await this.prismaService.operation.update({
        where: { id: input.id },
        data: {
          amount: input.amount,
          date: input.date,
          description: input.description,
          type: input.type,
          category: input.categoryId
            ? {
                connect: { id: input.categoryId },
              }
            : undefined,
          account: input.accountId
            ? {
                connect: { id: input.accountId },
              }
            : undefined,
          tags: input.tags
            ? {
                set: input.tags.map((id) => ({ id })),
              }
            : undefined,
        },
        include: {
          category: true,
          account: true,
          tags: true,
        },
      });

      return updated;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to update operation');
      }

      throw error;
    }
  }

  public async delete(id: string, user: User): Promise<boolean> {
    try {
      await this.findOne(id, user);

      const result = await this.prismaService.operation.delete({
        where: { id },
      });

      return !!result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to delete operation');
      }

      throw error;
    }
  }
}
