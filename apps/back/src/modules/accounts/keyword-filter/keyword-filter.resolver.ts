import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { KeywordFilterService } from './keyword-filter.service';
import { KeywordFilterModel } from './models/keyword-filter.model';
import { CreateKeywordFilterInput } from './inputs/create-keyword-filter.input';
import { Authorization } from '@back/shared/decorators/auth.decorator';

@Resolver(() => KeywordFilterModel)
export class KeywordFilterResolver {
  constructor(private readonly keywordFilterService: KeywordFilterService) {}

  @Authorization()
  @Mutation(() => KeywordFilterModel)
  public async createKeywordFilter(
    @Context() { req }: any,
    @Args('input') input: CreateKeywordFilterInput,
  ): Promise<KeywordFilterModel> {
    return this.keywordFilterService.createKeywordFilter(req.user.id, input);
  }

  @Authorization()
  @Query(() => [KeywordFilterModel])
  public async getKeywordFilters(
    @Context() { req }: any,
  ): Promise<KeywordFilterModel[]> {
    return this.keywordFilterService.getKeywordFilters(req.user.id);
  }

  @Authorization()
  @Mutation(() => Boolean)
  public async deleteKeywordFilter(
    @Context() { req }: any,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.keywordFilterService.deleteKeywordFilter(req.user.id, id);
  }
}
