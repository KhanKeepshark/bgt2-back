import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SessionService } from './session.service';
import { LoginInput } from './inputs/login.inputs';
import { LoginWithGoogleInput } from './inputs/login-with-google.input';
import { GqlContext } from '@back/shared/types/gql-context.types';
import { UserAgent } from '@back/shared/decorators/user-agent.decorator';
import {
  Authorization,
  AdminOnly,
} from '@back/shared/decorators/auth.decorator';
import { GqlThrottlerGuard } from '@back/shared/guards/gql-throttler.guard';
import { SessionModel } from './models/session.model';
import { AuthModel } from '../user/models/auth.model';
@Resolver('Session')
export class SessionResolver {
  constructor(private readonly sessionService: SessionService) {}

  @AdminOnly()
  @Mutation(() => AuthModel, { name: 'impersonateUser' })
  public async impersonate(
    @Context() { req }: GqlContext,
    @Args('userId') userId: string,
    @UserAgent() userAgent: string,
  ) {
    return await this.sessionService.impersonate(req, userId, userAgent);
  }

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
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  public async login(
    @Context() { req }: GqlContext,
    @Args('data') input: LoginInput,
    @UserAgent() userAgent: string,
  ) {
    return await this.sessionService.login(req, input, userAgent);
  }

  @Mutation(() => AuthModel, { name: 'loginWithGoogle' })
  @UseGuards(GqlThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  public async loginWithGoogle(
    @Context() { req }: GqlContext,
    @Args('data') input: LoginWithGoogleInput,
    @UserAgent() userAgent: string,
  ) {
    return await this.sessionService.loginWithGoogle(req, input, userAgent);
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
