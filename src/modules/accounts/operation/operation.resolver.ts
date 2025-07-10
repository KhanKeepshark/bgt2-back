import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OperationService } from './operation.service';
import { CreateOperationInput } from './inputs/create-operation.input';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { OperationModel } from './models/operation.model';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';
import { User } from '@/prisma/generated';
import { UpdateOperationInput } from './inputs/update-operation.input';

@Resolver('Operation')
export class OperationResolver {
  constructor(private readonly operationService: OperationService) {}

  @Authorization()
  @Mutation(() => OperationModel, { name: 'createOperation' })
  public async createOperation(
    @Args('input') input: CreateOperationInput,
    @Authorized() user: User,
  ) {
    return this.operationService.create(input, user);
  }

  @Authorization()
  @Query(() => [OperationModel], { name: 'findAllOperations' })
  public async findAllOperations(@Authorized() user: User) {
    return this.operationService.findAll(user);
  }

  @Authorization()
  @Query(() => OperationModel, { name: 'findOneOperation' })
  public async findOneOperation(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.operationService.findOne(id, user);
  }

  @Authorization()
  @Mutation(() => OperationModel, { name: 'updateOperation' })
  public async updateOperation(
    @Args('input') input: UpdateOperationInput,
    @Authorized() user: User,
  ) {
    return this.operationService.update(input, user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'deleteOperation' })
  public async deleteOperation(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.operationService.delete(id, user);
  }
}
