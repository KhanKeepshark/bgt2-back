import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { VerificationService } from './verification.service';
import { VerificationInput } from './inputs/verification.input';

@Resolver('Verification')
export class VerificationResolver {
  public constructor(
    private readonly verificationService: VerificationService,
  ) {}

  @Mutation(() => Boolean, { name: 'verifyAccount' })
  public async verify(
    @Args('input') input: VerificationInput,
  ) {
    return this.verificationService.verify(input);
  }
}
