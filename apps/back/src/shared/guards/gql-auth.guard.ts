import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  type CanActivate,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

function isPrismaConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as Error & { code?: string }).code;
  return (
    code === 'P1001' ||
    code === 'P1017' ||
    error.message.includes('Server has closed the connection') ||
    error.message.includes('Connection terminated')
  );
}

@Injectable()
export class GqlAuthGuard implements CanActivate {
  public constructor(private readonly prismaService: PrismaService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (typeof request.session.userId === 'undefined') {
      throw new UnauthorizedException('User not authorized');
    }

    if (request.session.totpPending === true) {
      throw new UnauthorizedException('User not authorized');
    }

    const user = await this.loadSessionUser(request.session.userId);

    if (!user) {
      throw new UnauthorizedException('User not authorized');
    }

    request.user = user;

    return true;
  }

  private async loadSessionUser(userId: string) {
    try {
      return await this.prismaService.user.findUnique({
        where: { id: userId },
        include: { subscriptionPlan: true },
      });
    } catch (error) {
      if (!isPrismaConnectionError(error)) {
        throw error;
      }
      await this.prismaService.reconnect();
      return this.prismaService.user.findUnique({
        where: { id: userId },
        include: { subscriptionPlan: true },
      });
    }
  }
}
