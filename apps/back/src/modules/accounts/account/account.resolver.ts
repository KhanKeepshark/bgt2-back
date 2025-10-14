import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AccountService } from './account.service';
import { CreateAccountInput } from './inputs/create-account.input';
import { Authorization } from '@back/src/shared/decorators/auth.decorator';
import { AccountModel } from './models/account.model';
import { Authorized } from '@back/src/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';
import { UpdateAccountInput } from './inputs/update-account.input';

@Resolver('Account')
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

  @Authorization()
  @Mutation(() => AccountModel, { name: 'createAccount' })
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

  // TODO: return authorization
  // @Authorization()
  @Query(() => AccountModel, { name: 'findOneAccount' })
  public async findOneAccount(
    @Args('id') id: string,
    // @Authorized() user: User,
  ) {
    return this.accountService.findOne(id);
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
}
