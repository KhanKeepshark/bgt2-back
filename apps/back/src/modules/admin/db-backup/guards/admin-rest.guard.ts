import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminRestGuard implements CanActivate {
  public constructor(private readonly prismaService: PrismaService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (typeof request.session?.userId === 'undefined') {
      throw new UnauthorizedException('User not authorized');
    }

    if (request.session.totpPending === true) {
      throw new UnauthorizedException('User not authorized');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: request.session.userId },
      include: { subscriptionPlan: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not authorized');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    request.user = user;
    return true;
  }
}
