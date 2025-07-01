import type { User } from '@/prisma/generated';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const Authorized = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    let user: User;

    if (ctx.getType() === 'http') {
      const request = ctx.switchToHttp().getRequest();
      user = request.user;
    } else {
      const context = GqlExecutionContext.create(ctx);
      user = context.getContext().req.user;
    }

    return data ? user && user[data] : user;
  },
);
