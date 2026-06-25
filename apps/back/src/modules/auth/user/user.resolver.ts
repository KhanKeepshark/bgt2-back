import {
  Args,
  Context,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UserService } from './user.service';
import { UserModel } from './models/user.model';
import { PaginatedUsersModel } from './models/paginated-users.model';
import { PremiumInterestStatsModel } from './models/premium-interest-stats.model';
import { UpdateUserInput } from './inputs/update-user.input';
import { UserWhereInput } from './inputs/user-where.input';
import { UserOrderByInput } from './inputs/user-order-by.input';
import {
  AdminOnly,
  Authorization,
} from '@back/shared/decorators/auth.decorator';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { CreateUserInput } from './inputs/create-user.input';
import { AcceptLegalDocumentsInput } from './inputs/accept-legal-documents.input';
import { ResetPasswordInput } from './inputs/reset-password.input';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GqlThrottlerGuard } from '../../../shared/guards/gql-throttler.guard';
import { GqlContext } from '@back/shared/types/gql-context.types';
import { UserAgent } from '@back/shared/decorators/user-agent.decorator';

@Resolver(() => UserModel)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @ResolveField(() => String)
  @AdminOnly()
  public password(@Parent() user: UserModel): string {
    return user.password;
  }

  @ResolveField(() => String, { nullable: true })
  @AdminOnly()
  public totpSecret(@Parent() user: UserModel): string | null {
    return user.totpSecret;
  }

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

  @Query(() => PremiumInterestStatsModel, { name: 'premiumInterestStats' })
  @AdminOnly()
  public async premiumInterestStats() {
    return this.userService.getPremiumInterestStats();
  }

  @Query(() => UserModel, { name: 'me' })
  @Authorization()
  public async me(@Authorized('id') id: string) {
    return this.userService.me(id);
  }

  @Mutation(() => Boolean, { name: 'createUser' })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  public async create(
    @Args('data') input: CreateUserInput,
    @Context() { req }: GqlContext,
    @UserAgent() userAgent: string,
  ) {
    return this.userService.create(input, req.ip, userAgent);
  }

  @Mutation(() => Boolean, { name: 'acceptLegalDocuments' })
  @Authorization()
  public async acceptLegalDocuments(
    @Authorized('id') id: string,
    @Args('data') input: AcceptLegalDocumentsInput,
    @Context() { req }: GqlContext,
    @UserAgent() userAgent: string,
  ) {
    return this.userService.acceptLegalDocuments(id, input, req.ip, userAgent);
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

  @Mutation(() => Boolean, { name: 'sendPasswordResetEmail' })
  @Authorization()
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
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

  @Mutation(() => UserModel, { name: 'registerPremiumInterest' })
  @Authorization()
  public async registerPremiumInterest(
    @Authorized('id') id: string,
    @Args('reason') reason: string,
  ) {
    return this.userService.registerPremiumInterest(id, reason);
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
