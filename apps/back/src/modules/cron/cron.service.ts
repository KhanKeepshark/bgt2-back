import { PrismaService } from '@back/src/core/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurrenceService } from '../accounts/recurrenceConfig/recurrence.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly recurrenceService: RecurrenceService,
  ) {}

  /**
   * Обработка повторяющихся операций каждый день в 00:01
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurringOperations() {
    this.logger.log('Starting recurring operations processing...');

    try {
      const stats = await this.recurrenceService.processRecurringOperations();

      this.logger.log(
        `Recurring operations processed: ${stats.processed} total, ${stats.created} created, ${stats.errors} errors`,
      );
    } catch (error) {
      this.logger.error('Failed to process recurring operations:', error);
    }
  }
}
