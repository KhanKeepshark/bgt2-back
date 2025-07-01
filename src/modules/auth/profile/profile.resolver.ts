import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ProfileService } from './profile.service';
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';
import { User } from '@/prisma/generated';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { FileValidationPipe } from '@/src/shared/pipes/file-validation.pipe';
import { ChangeProfileInfoInput } from './inputs/change-profile-info.input';

@Resolver('Profile')
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Authorization()
  @Mutation(() => String, { name: 'changeProfileAvatar' })
  public async changeAvatar(
    @Authorized() user: User,
    @Args('avatar', { type: () => GraphQLUpload }, FileValidationPipe)
    avatar: GraphQLUpload,
  ) {
    return this.profileService.changeAvatar(user, avatar);
  }

  @Authorization()
  @Mutation(() => String, { name: 'deleteProfileAvatar' })
  public async deleteAvatar(@Authorized() user: User) {
    return this.profileService.deleteAvatar(user);
  }

  @Authorization()
  @Mutation(() => String, { name: 'changeProfileInfo' })
  public async changeProfileInfo(
    @Authorized() user: User,
    @Args('input') input: ChangeProfileInfoInput,
  ) {
    return this.profileService.changeProfileInfo(user, input);
  }
}
