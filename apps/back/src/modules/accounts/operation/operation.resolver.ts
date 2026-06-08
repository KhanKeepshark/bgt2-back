import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OperationService } from './operation.service';
import { GqlThrottlerGuard } from '@back/shared/guards/gql-throttler.guard';
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
import { OperationDataLoader } from './operation.dataloader';
import { CategoryModel } from '../category/models/category.model';
import { AccountModel } from '../account/models/account.model';
import { TagModel } from '../tag/model/tag.model';
import { getHotWindowStartMonth } from '@back/shared/operation-retention/operation-retention.util';

@Resolver(() => OperationModel)
export class OperationResolver {
  constructor(
    private readonly operationService: OperationService,
    private readonly operationDataLoader: OperationDataLoader,
  ) {}

  @Authorization()
  @Mutation(() => [OperationModel], { name: 'createExtractedOperations' })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  public async createOperation(
    @Args('input') input: CreateOperationInput,
    @Authorized() user: User,
  ) {
    return this.operationService.create(input, user);
  }

  @Authorization()
  @Query(() => Int, { name: 'countUserOperations' })
  public async countUserOperations(@Authorized() user: User) {
    return this.operationService.countUserOperations(user);
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
  @Query(() => Date, { name: 'operationsRetentionStartMonth' })
  public operationsRetentionStartMonth(): Date {
    return getHotWindowStartMonth();
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

  @ResolveField(() => CategoryModel, { nullable: true })
  public async category(@Parent() operation: OperationModel) {
    if (!operation.categoryId) return null;
    return this.operationDataLoader.categoryLoader.load(operation.categoryId);
  }

  @ResolveField(() => AccountModel)
  public async account(@Parent() operation: OperationModel) {
    return this.operationDataLoader.accountLoader.load(operation.accountId);
  }

  @ResolveField(() => AccountModel, { nullable: true })
  public async transferAccount(@Parent() operation: OperationModel) {
    if (!operation.transferAccountId) return null;
    return this.operationDataLoader.accountLoader.load(
      operation.transferAccountId,
    );
  }

  @ResolveField(() => [TagModel], { nullable: true })
  public async tags(@Parent() operation: OperationModel) {
    return this.operationDataLoader.tagsLoader.load(operation.id);
  }
}
