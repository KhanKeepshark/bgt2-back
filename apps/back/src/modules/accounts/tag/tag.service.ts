import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTagInput } from './inputs/create-tag.input';
import { Tag, User } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { UpdateTagInput } from './inputs/update-tag.input';
import { TagError, SubscriptionError } from '@back/shared/constants/errors.constants';

@Injectable()
export class TagService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(input: CreateTagInput, user: User): Promise<Tag> {
    try {
      const existingTag = await this.prismaService.tag.findFirst({
        where: { name: input.name, userId: user.id },
      });

      if (existingTag) {
        throw new BadRequestException(TagError.ALREADY_EXISTS);
      }

      // Проверка лимитов плана
      const userWithPlan = await this.prismaService.user.findUnique({
        where: { id: user.id },
        include: { subscriptionPlan: true, _count: { select: { tags: true } } },
      });

      if (userWithPlan?.subscriptionPlan?.maxTags !== null) {
        if (userWithPlan._count.tags >= userWithPlan.subscriptionPlan.maxTags) {
          throw new BadRequestException({
            key: SubscriptionError.LIMIT_REACHED,
            args: { max: userWithPlan.subscriptionPlan.maxTags },
          });
        }
      }

      const created = await this.prismaService.tag.create({
        data: { ...input, user: { connect: { id: user.id } } },
      });

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(TagError.CREATION_FAILED);
      }

      throw error;
    }
  }

  public async findAll(user: User): Promise<Tag[]> {
    try {
      const tags = await this.prismaService.tag.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      return tags;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(TagError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async findOne(id: string, user: User): Promise<Tag> {
    try {
      const tag = await this.prismaService.tag.findFirst({
        where: { id, userId: user.id },
      });

      if (!tag) {
        throw new NotFoundException(TagError.NOT_FOUND);
      }

      return tag;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(TagError.NOT_FOUND);
      }

      throw error;
    }
  }

  public async update(input: UpdateTagInput, user: User): Promise<Tag> {
    try {
      if (input.name) {
        const existingTag = await this.prismaService.tag.findFirst({
          where: {
            userId: user.id,
            name: input.name,
          },
        });

        if (existingTag) {
          throw new BadRequestException(TagError.ALREADY_EXISTS);
        }
      }

      const updated = await this.prismaService.tag.update({
        where: { id: input.id, userId: user.id },
        data: input,
      });

      return updated;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(TagError.UPDATE_FAILED);
      }

      throw error;
    }
  }

  public async delete(id: string, user: User): Promise<boolean> {
    try {
      const result = await this.prismaService.tag.delete({
        where: { id, userId: user.id },
      });

      return !!result;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(TagError.DELETION_FAILED);
      }

      throw error;
    }
  }
}
