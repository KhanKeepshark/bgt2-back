import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TagService } from './tag.service';
import { GqlThrottlerGuard } from '@back/shared/guards/gql-throttler.guard';
import { TagModel } from './model/tag.model';
import { CreateTagInput } from './inputs/create-tag.input';
import { Authorization } from '@back/shared/decorators/auth.decorator';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';
import { UpdateTagInput } from './inputs/update-tag.input';

@Resolver('Tag')
export class TagResolver {
  constructor(private readonly tagService: TagService) {}

  @Authorization()
  @Mutation(() => TagModel, { name: 'createTag' })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  public async createTag(
    @Args('input') input: CreateTagInput,
    @Authorized() user: User,
  ) {
    return this.tagService.create(input, user);
  }

  @Authorization()
  @Query(() => [TagModel], { name: 'findAllTags' })
  public async findAllTags(@Authorized() user: User) {
    return this.tagService.findAll(user);
  }

  @Authorization()
  @Query(() => TagModel, { name: 'findOneTag' })
  public async findOneTag(@Args('id') id: string, @Authorized() user: User) {
    return this.tagService.findOne(id, user);
  }

  @Authorization()
  @Mutation(() => TagModel, { name: 'updateTag' })
  public async updateTag(
    @Args('input') input: UpdateTagInput,
    @Authorized() user: User,
  ) {
    return this.tagService.update(input, user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'deleteTag' })
  public async deleteTag(@Args('id') id: string, @Authorized() user: User) {
    return this.tagService.delete(id, user);
  }
}
