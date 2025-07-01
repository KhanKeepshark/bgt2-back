import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TotpService } from './totp.service';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';
import { User } from '@/prisma/generated';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { TotpModel } from './models/totp.model';
import { EnableTotpInput } from './inputs/enable-totp.input';

@Resolver('Totp')
export class TotpResolver {
  public constructor(private readonly totpService: TotpService) {}

  @Authorization()
  @Query(() => TotpModel, { name: 'generateTotpSecret' })
  public async generateTotpSecret(@Authorized() user: User) {
    return this.totpService.generateTotpSecret(user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'enableTotp' })
  public async enableTotp(
    @Authorized() user: User,
    @Args('input') input: EnableTotpInput,
  ) {
    return this.totpService.enable(user, input);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'disableTotp' })
  public async disableTotp(@Authorized() user: User) {
    return this.totpService.disable(user);
  }
}
