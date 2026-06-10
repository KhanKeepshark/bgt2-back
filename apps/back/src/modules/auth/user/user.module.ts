import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserConsentService } from './user-consent.service';
import { UserResolver } from './user.resolver';
import { VerificationService } from '../verification/verification.service';
import { AccountModule } from '../../accounts/account/account.module';
import { CategoryModule } from '../../accounts/category/category.module';

@Module({
  imports: [AccountModule, CategoryModule],
  providers: [
    UserResolver,
    UserService,
    UserConsentService,
    VerificationService,
  ],
  exports: [UserService, UserConsentService],
})
export class UserModule {}
