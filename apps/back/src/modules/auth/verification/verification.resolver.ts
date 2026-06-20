import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { VerificationService } from './verification.service';
import { VerificationInput } from './inputs/verification.input';
import { ResendVerificationInput } from './inputs/resend-verification.input';
import { VerificationResendStatus } from './models/verification-resend-status.model';

@Resolver('Verification')
export class VerificationResolver {
  public constructor(
    private readonly verificationService: VerificationService,
  ) {}

  @Mutation(() => Boolean, { name: 'verifyAccount' })
  public async verify(@Args('input') input: VerificationInput) {
    return this.verificationService.verify(input);
  }

  @Query(() => VerificationResendStatus, { name: 'verificationResendStatus' })
  public async getResendStatus(
    @Args('email', { nullable: true }) email?: string,
    @Args('token', { nullable: true }) token?: string,
  ) {
    return this.verificationService.getResendStatus(email, token);
  }

  @Mutation(() => Boolean, { name: 'resendVerificationEmail' })
  public async resendVerificationEmail(
    @Args('input') input: ResendVerificationInput,
  ) {
    return this.verificationService.resendVerificationEmail(input);
  }
}
