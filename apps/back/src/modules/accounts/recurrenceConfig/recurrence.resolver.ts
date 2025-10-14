import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RecurrenceService } from './recurrence.service';
import { Authorization } from '@back/src/shared/decorators/auth.decorator';
import { Authorized } from '@back/src/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';
import { RecurrenceConfigModel } from './models/recurrence-config.model';
import { UpdateRecurrenceInput } from './inputs/update-recurrence.input';

@Resolver('RecurrenceConfig')
export class RecurrenceResolver {
  constructor(private readonly recurrenceService: RecurrenceService) {}

  @Authorization()
  @Query(() => [RecurrenceConfigModel], { name: 'findAllRecurrences' })
  public async findAllRecurrences(@Authorized() user: User) {
    return this.recurrenceService.findAllRecurrences(user);
  }

  @Authorization()
  @Query(() => RecurrenceConfigModel, { name: 'findOneRecurrence' })
  public async findOneRecurrence(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.recurrenceService.findOneRecurrence(id, user);
  }

  @Authorization()
  @Mutation(() => RecurrenceConfigModel, { name: 'updateRecurrence' })
  public async updateRecurrence(
    @Args('input') input: UpdateRecurrenceInput,
    @Authorized() user: User,
  ) {
    return this.recurrenceService.updateRecurrence(input.id, input, user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'deleteRecurrence' })
  public async deleteRecurrence(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.recurrenceService.deleteRecurrence(id, user);
  }
}
