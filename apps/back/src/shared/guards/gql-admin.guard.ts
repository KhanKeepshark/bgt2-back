import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlAdminGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (typeof request.user === 'undefined') {
      throw new UnauthorizedException('User not authorized');
    }

    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
