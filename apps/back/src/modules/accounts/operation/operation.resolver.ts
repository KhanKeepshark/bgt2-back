import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OperationService } from './operation.service';
import { CreateOperationInput } from './inputs/create-operation.input';
import { Authorization } from '@back/shared/decorators/auth.decorator';
import { OperationModel } from './models/operation.model';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';
import { UpdateOperationInput } from './inputs/update-operation.input';
import { OperationDayGroupModel } from './models/operation-day-group.model';
import { OperationFilterInput } from './inputs/operation-filter.input';
import { OperationChartsFilterInput } from './inputs/operation-charts-filter';
import { OperationChartDataModel } from './models/operation-chart-data.model';
import { ExtractedOperationInput } from './inputs/extracted-operation.input';

@Resolver('Operation')
export class OperationResolver {
  constructor(private readonly operationService: OperationService) {}

  @Authorization()
  @Mutation(() => [OperationModel], { name: 'createExtractedOperations' })
  public async createExtractedOperations(
    @Args('accountId') accountId: string,
    @Args('operations', { type: () => [ExtractedOperationInput] })
    operations: ExtractedOperationInput[],
    @Authorized() user: User,
  ) {
    return this.operationService.createExtracted(accountId, operations, user);
  }

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
  @Query(() => [OperationDayGroupModel], {
    name: 'findAllOperationsSortedByDays',
  })
  public async findAllOperationsSortedByDays(
    @Authorized() user: User,
    @Args('filter', { nullable: true }) filter?: OperationFilterInput,
  ) {
    return this.operationService.findAllSortedByDays(user, filter);
  }

  @Authorization()
  @Query(() => OperationChartDataModel, { name: 'findAllOperationsForCharts' })
  public async findAllOperationsForCharts(
    @Authorized() user: User,
    @Args('filter', { nullable: true }) filter?: OperationChartsFilterInput,
  ) {
    return this.operationService.findAllForCharts(user, filter);
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

  @Authorization()
  @Mutation(() => Boolean, { name: 'deleteAllOperations' })
  public async deleteAllOperations(@Authorized() user: User) {
    return this.operationService.deleteAll(user);
  }
}
