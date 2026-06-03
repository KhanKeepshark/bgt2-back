import { Args, Query, Resolver } from '@nestjs/graphql';
import { AdminOnly } from '@back/shared/decorators/auth.decorator';
import { UserStatsModel } from './models/user-stats.model';
import { UserStatsService } from './user-stats.service';

@Resolver(() => UserStatsModel)
export class UserStatsResolver {
  constructor(private readonly userStatsService: UserStatsService) {}

  @Query(() => UserStatsModel, { name: 'userStats' })
  @AdminOnly()
  public async getUserStats(@Args('userId') userId: string) {
    return this.userStatsService.getStats(userId);
  }
}
