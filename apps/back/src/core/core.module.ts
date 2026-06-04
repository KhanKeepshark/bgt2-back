import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { IS_DEV_ENV } from '../shared/utils/is-dev.util';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { getGraphqlConfig } from './config/graphql.config';
import { RedisModule } from './redis/redis.module';
import { UserModule } from '../modules/auth/user/user.module';
import { SessionModule } from '../modules/auth/session/session.module';
import { TotpModule } from '../modules/auth/totp/totp.module';
import { CronModule } from '../modules/cron/cron.module';
import { VerificationModule } from '../modules/auth/verification/verification.module';
import { MailModule } from '../modules/libs/mail/mail.module';
import { AccountModule } from '../modules/accounts/account/account.module';
import { TagModule } from '../modules/accounts/tag/tag.module';
import { OperationModule } from '../modules/accounts/operation/operation.module';
import { CategoryModule } from '../modules/accounts/category/category.module';
import { KeywordFilterModule } from '../modules/accounts/keyword-filter/keyword-filter.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { AiUploadModule } from '../modules/files/ai-upload/ai-upload.module';
import { FileUploadModule } from '../modules/files/file-upload/file-upload.module';
import { FileDownloadModule } from '../modules/files/file-download/file-download.module';
import { NotificationModule } from '../modules/notifications/notification.module';
import { SubscriptionPlanModule } from '../modules/subscription-plan/subscription-plan.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { SystemMetricModule } from '../modules/system-metric/system-metric.module';
import { UserStatsModule } from '../modules/user-stats/user-stats.module';
import { SupportModule } from '../modules/support/support.module';
import { DbBackupModule } from '../modules/admin/db-backup/db-backup.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { GeminiModule } from '../modules/libs/gemini/gemini.module';
import { FileStorageModule } from '../modules/libs/file-storage/file-storage.module';
import { LimitGateModule } from '../shared/limit-gate/limit-gate.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: !IS_DEV_ENV,
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: getGraphqlConfig,
      inject: [ConfigService],
    }),
    PrismaModule,
    LimitGateModule,
    RedisModule,
    CronModule,
    UserModule,
    SessionModule,
    TotpModule,
    VerificationModule,
    MailModule,
    AccountModule,
    AiUploadModule,
    TagModule,
    OperationModule,
    CategoryModule,
    KeywordFilterModule,
    RabbitmqModule,
    FileUploadModule,
    FileDownloadModule,
    NotificationModule,
    SubscriptionPlanModule,
    PaymentsModule,
    SystemMetricModule,
    UserStatsModule,
    SupportModule,
    DbBackupModule,
    GeminiModule,
    FileStorageModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class CoreModule {}
