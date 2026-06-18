import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTagInput } from './inputs/create-tag.input';
import { Tag, User } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { UpdateTagInput } from './inputs/update-tag.input';
import { TagError } from '@back/shared/constants/errors.constants';
import { LimitGateService } from '@back/shared/limit-gate/limit-gate.service';

@Injectable()
export class TagService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly limitGate: LimitGateService,
  ) {}

  public async create(input: CreateTagInput, user: User): Promise<Tag> {
    try {
      const existingTag = await this.prismaService.tag.findFirst({
        where: { name: input.name, userId: user.id },
      });

      if (existingTag) {
        throw new BadRequestException(TagError.ALREADY_EXISTS);
      }

      return await this.prismaService.$transaction(async (tx) => {
        await this.limitGate.lockUserForLimits(tx, user.id);
        await this.limitGate.assertCanCreateTag(user.id, tx);

        return tx.tag.create({
          data: { ...input, user: { connect: { id: user.id } } },
        });
      });
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
            id: { not: input.id },
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
