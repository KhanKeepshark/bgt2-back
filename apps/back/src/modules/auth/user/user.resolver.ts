import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserService } from './user.service';
import { UserModel } from './models/user.model';
import { CreateUserInput } from './inputs/create-user.input';
import { Authorization } from '@back/src/shared/decorators/auth.decorator';
import { Authorized } from '@back/src/shared/decorators/authorized.decorator';

@Resolver('User')
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => [UserModel], { name: 'findAllUsers' })
  public async findAll() {
    return this.userService.findAll();
  }

  @Query(() => UserModel, { name: 'findProfile' })
  @Authorization()
  public async me(@Authorized('id') id: string) {
    return this.userService.me(id);
  }

  @Mutation(() => Boolean, { name: 'createUser' })
  public async create(@Args('data') input: CreateUserInput) {
    return this.userService.create(input);
  }
}
