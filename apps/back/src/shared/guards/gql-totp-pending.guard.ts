import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  type CanActivate,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlTotpPendingGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (request.session?.totpPending !== true || !request.session?.userId) {
      throw new UnauthorizedException('TOTP verification required');
    }

    return true;
  }
}
