import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SessionService } from './session.service';
import { LoginInput } from './inputs/login.inputs';
import { GqlContext } from '@/src/shared/types/gql-context.types';
import { UserAgent } from '@/src/shared/decorators/user-agent.decorator';
import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { SessionModel } from './models/session.model';
import { AuthModel } from '../account/models/auth.model';
@Resolver('Session')
export class SessionResolver {
  constructor(private readonly sessionService: SessionService) {}

  @Authorization()
  @Query(() => [SessionModel], { name: 'findSessionsByUser' })
  public async findSessionsByUser(@Context() { req }: GqlContext) {
    return await this.sessionService.findSessionsByUser(req);
  }

  @Authorization()
  @Query(() => SessionModel, { name: 'findCurrentSession' })
  public async findCurrentSession(@Context() { req }: GqlContext) {
    return await this.sessionService.findCurrentSession(req);
  }

  @Mutation(() => AuthModel, { name: 'loginUser' })
  public async login(
    @Context() { req }: GqlContext,
    @Args('data') input: LoginInput,
    @UserAgent() userAgent: string,
  ) {
    return await this.sessionService.login(req, input, userAgent);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'logoutUser' })
  public async logout(@Context() { req }: GqlContext) {
    return await this.sessionService.logout(req);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'clearSessionCookie' })
  public async clearSessionCookie(@Context() { req }: GqlContext) {
    return await this.sessionService.clearSessionCookie(req);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'removeSession' })
  public async removeSession(
    @Context() { req }: GqlContext,
    @Args('id') id: string,
  ) {
    return await this.sessionService.remove(req, id);
  }
}
