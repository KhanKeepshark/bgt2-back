import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AccountService } from './account.service';
import { GqlThrottlerGuard } from '@back/shared/guards/gql-throttler.guard';
import { CreateAccountInput } from './inputs/create-account.input';
import { Authorization } from '@back/shared/decorators/auth.decorator';
import { AccountModel } from './models/account.model';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';
import { UpdateAccountInput } from './inputs/update-account.input';

@Resolver('Account')
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @Authorization()
  @Mutation(() => AccountModel, { name: 'createAccount' })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  public async createAccount(
    @Args('input') input: CreateAccountInput,
    @Authorized() user: User,
  ) {
    return this.accountService.create(input, user);
  }

  @Authorization()
  @Query(() => [AccountModel], { name: 'findAllAccounts' })
  public async findAllAccounts(@Authorized() user: User) {
    return this.accountService.findAll(user);
  }

  @Authorization()
  @Mutation(() => AccountModel, { name: 'updateAccount' })
  public async updateAccount(
    @Args('input') input: UpdateAccountInput,
    @Authorized() user: User,
  ) {
    return this.accountService.update(input, user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'deleteAccount' })
  public async deleteAccount(@Args('id') id: string, @Authorized() user: User) {
    return this.accountService.delete(id, user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'accountHasOperations' })
  public async accountHasOperations(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.accountService.hasOperations(id, user);
  }
}
