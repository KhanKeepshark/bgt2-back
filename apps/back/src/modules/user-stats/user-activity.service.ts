import { Injectable } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  UserActivityEventStatus,
  UserActivityEventType,
} from '@prisma/generated';

@Injectable()
export class UserActivityService {
  constructor(private readonly prismaService: PrismaService) {}

  public async logExportSuccess(userId: string): Promise<void> {
    await this.prismaService.userActivityEvent.create({
      data: {
        userId,
        type: UserActivityEventType.EXPORT,
        status: UserActivityEventStatus.SUCCESS,
      },
    });
  }
}
