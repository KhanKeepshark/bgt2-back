import { Module } from '@nestjs/common';
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
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { AiUploadModule } from '../modules/files/ai-upload/ai-upload.module';
import { FileUploadModule } from '../modules/files/file-upload/file-upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: !IS_DEV_ENV,
      isGlobal: true,
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: getGraphqlConfig,
      inject: [ConfigService],
    }),
    PrismaModule,
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
    RabbitmqModule,
    FileUploadModule,
  ],
})
export class CoreModule {}
