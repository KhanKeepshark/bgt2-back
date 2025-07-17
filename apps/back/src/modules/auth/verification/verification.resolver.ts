import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { VerificationService } from './verification.service';
import { VerificationInput } from './inputs/verification.input';
import { UserAgent } from '@back/src/shared/decorators/user-agent.decorator';
import { GqlContext } from '@back/src/shared/types/gql-context.types';
import { AuthModel } from '../user/models/auth.model';

@Resolver('Verification')
export class VerificationResolver {
  public constructor(
    private readonly verificationService: VerificationService,
  ) {}

  @Mutation(() => AuthModel, { name: 'verifyAccount' })
  public async verify(
    @Context() { req }: GqlContext,
    @Args('input') input: VerificationInput,
    @UserAgent() userAgent: string,
  ) {
    return this.verificationService.verify(input, req, userAgent);
  }
}
