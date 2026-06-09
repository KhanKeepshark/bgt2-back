import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { UserModel } from './models/user.model';
import { PaginatedUsersModel } from './models/paginated-users.model';
import { UpdateUserInput } from './inputs/update-user.input';
import { UserWhereInput } from './inputs/user-where.input';
import { UserOrderByInput } from './inputs/user-order-by.input';
import {
  AdminOnly,
  Authorization,
} from '@back/shared/decorators/auth.decorator';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { CreateUserInput } from './inputs/create-user.input';
import { ChangePasswordInput } from './inputs/change-password.input';
import { ResetPasswordInput } from './inputs/reset-password.input';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GqlThrottlerGuard } from '../../../shared/guards/gql-throttler.guard';

@Resolver('User')
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => PaginatedUsersModel, { name: 'findAllUsers' })
  @AdminOnly()
  public async findAll(
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('items', { type: () => Int, nullable: true }) items?: number,
    @Args('where', { nullable: true }) where?: UserWhereInput,
    @Args('orderBy', { nullable: true }) orderBy?: UserOrderByInput,
  ) {
    const pageNum = page ?? 1;
    const itemsPerPage = items ?? 10;
    return this.userService.findAll(pageNum, itemsPerPage, where, orderBy);
  }

  @Query(() => UserModel, { name: 'me' })
  @Authorization()
  public async me(@Authorized('id') id: string) {
    return this.userService.me(id);
  }

  @Mutation(() => Boolean, { name: 'createUser' })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  public async create(@Args('data') input: CreateUserInput) {
    return this.userService.create(input);
  }

  @Query(() => UserModel, { name: 'findUser' })
  @AdminOnly()
  public async findOne(@Args('id') id: string) {
    return this.userService.findOne(id);
  }

  @Mutation(() => UserModel, { name: 'updateUser' })
  @AdminOnly()
  public async update(@Args('data') input: UpdateUserInput) {
    return this.userService.update(input);
  }

  @Mutation(() => UserModel, { name: 'changePassword' })
  @Authorization()
  public async changePassword(
    @Authorized('id') id: string,
    @Args('data') input: ChangePasswordInput,
  ) {
    return this.userService.changePassword(id, input);
  }

  @Mutation(() => Boolean, { name: 'sendPasswordResetEmail' })
  @Authorization()
  public async sendPasswordResetEmail(
    @Authorized('id') id: string,
    @Args('language', { nullable: true }) language?: string,
  ) {
    return this.userService.sendPasswordResetEmail(id, language);
  }

  @Mutation(() => Boolean, { name: 'forgotPassword' })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 86400000 } })
  public async forgotPassword(
    @Args('email') email: string,
    @Args('language', { nullable: true }) language?: string,
  ) {
    return this.userService.forgotPassword(email, language);
  }

  @Mutation(() => Boolean, { name: 'resetPassword' })
  public async resetPassword(@Args('data') input: ResetPasswordInput) {
    return this.userService.resetPassword(input);
  }

  @Mutation(() => UserModel, { name: 'markWelcomeSheetSeen' })
  @Authorization()
  public async markWelcomeSheetSeen(@Authorized('id') id: string) {
    return this.userService.markWelcomeSheetSeen(id);
  }

  @Mutation(() => UserModel, { name: 'cancelPremiumSubscription' })
  @Authorization()
  public async cancelPremiumSubscription(@Authorized('id') id: string) {
    return this.userService.cancelPremiumSubscription(id);
  }

  @Mutation(() => UserModel, { name: 'removeUser' })
  @AdminOnly()
  public async remove(@Args('id') id: string) {
    return this.userService.remove(id);
  }
}
