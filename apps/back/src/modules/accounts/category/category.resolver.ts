import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CategoryService } from './category.service';
import { CreateCategoryInput } from './inputs/create-category.input';
import { Authorization } from '@back/shared/decorators/auth.decorator';
import { CategoryModel } from './models/category.model';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { CategoryType, User } from '@prisma/generated';
import { UpdateCategoryInput } from './inputs/update-category.input';
import { CategoryKeywordModel } from './models/category-keyword.model';
import { CreateCategoryKeywordInput } from './inputs/create-category-keyword.input';

@Resolver('Category')
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Authorization()
  @Mutation(() => CategoryModel, { name: 'createCategory' })
  public async createCategory(
    @Args('input') input: CreateCategoryInput,
    @Authorized() user: User,
  ) {
    return this.categoryService.create(input, user);
  }

  @Authorization()
  @Query(() => [CategoryModel], { name: 'findAllCategories' })
  public async findAllCategories(@Authorized() user: User) {
    return this.categoryService.findAll(user);
  }

  @Authorization()
  @Query(() => CategoryModel, { name: 'findOneCategory' })
  public async findOneCategory(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.categoryService.findOne(id, user);
  }

  @Authorization()
  @Mutation(() => CategoryModel, { name: 'updateCategory' })
  public async updateCategory(
    @Args('input') input: UpdateCategoryInput,
    @Authorized() user: User,
  ) {
    return this.categoryService.update(input, user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'deleteCategory' })
  public async deleteCategory(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.categoryService.delete(id, user);
  }

  @Authorization()
  @Query(() => [CategoryModel], { name: 'findCategoriesByType' })
  public async findCategoriesByType(
    @Args('type') type: string,
    @Authorized() user: User,
  ) {
    return this.categoryService.findByType(type as CategoryType, user);
  }

  @Authorization()
  @Mutation(() => CategoryKeywordModel, { name: 'createCategoryKeyword' })
  public async createCategoryKeyword(
    @Args('input') input: CreateCategoryKeywordInput,
    @Authorized() user: User,
  ) {
    return this.categoryService.createKeyword(input, user);
  }

  // TODO: Uncomment when update keyword will be implemented
  // @Authorization()
  // @Mutation(() => CategoryKeywordModel, { name: 'updateCategoryKeyword' })
  // public async updateCategoryKeyword(
  //   @Args('input') input: UpdateCategoryKeywordInput,
  //   @Authorized() user: User,
  // ) {
  //   return this.categoryService.updateKeyword(input, user);
  // }

  @Authorization()
  @Mutation(() => Boolean, { name: 'deleteCategoryKeyword' })
  public async deleteCategoryKeyword(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.categoryService.deleteKeyword(id, user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'categoryHasOperations' })
  public async categoryHasOperations(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.categoryService.hasOperations(id, user);
  }
}
