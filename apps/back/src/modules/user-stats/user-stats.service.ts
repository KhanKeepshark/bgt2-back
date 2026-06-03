import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  UserActivityEventStatus,
  UserActivityEventType,
} from '@prisma/generated';
import { LIMIT_GATE_TIMEZONE } from '@back/shared/limit-gate/monthly-operations-cap.util';
import { AuthError } from '@back/shared/constants/errors.constants';
import {
  buildDailyCountSeries,
  getUserOperationsDailyRange,
} from './utils/user-operations-daily.util';

type DailyOperationRow = {
  day: Date;
  count: bigint;
};

@Injectable()
export class UserStatsService {
  constructor(private readonly prismaService: PrismaService) {}

  public async getStats(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException(AuthError.USER_NOT_FOUND);
    }

    const { start, dateKeys } = getUserOperationsDailyRange();

    const [
      totalOperations,
      aiImportCount,
      exportCount,
      categoryKeywordCount,
      recurrenceCount,
      dailyRows,
    ] = await Promise.all([
      this.prismaService.operation.count({ where: { userId } }),
      this.prismaService.aiTokenUsage.count({ where: { userId } }),
      this.prismaService.userActivityEvent.count({
        where: {
          userId,
          type: UserActivityEventType.EXPORT,
          status: UserActivityEventStatus.SUCCESS,
        },
      }),
      this.prismaService.categoryKeyword.count({ where: { userId } }),
      this.prismaService.recurrenceConfig.count({ where: { userId } }),
      this.prismaService.$queryRaw<DailyOperationRow[]>`
        SELECT (o."createdAt" AT TIME ZONE ${LIMIT_GATE_TIMEZONE})::date AS day,
               COUNT(*)::bigint AS count
        FROM "Operation" o
        WHERE o."userId" = ${userId}
          AND o."createdAt" >= ${start}
        GROUP BY day
        ORDER BY day
      `,
    ]);

    const countsByDate = new Map(
      dailyRows.map((row) => [
        row.day.toISOString().slice(0, 10),
        Number(row.count),
      ]),
    );

    return {
      totalOperations,
      aiImportCount,
      exportCount,
      categoryKeywordCount,
      recurrenceCount,
      operationsDaily: buildDailyCountSeries(dateKeys, countsByDate),
    };
  }
}
