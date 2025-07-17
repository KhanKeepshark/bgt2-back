import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { VerificationService } from '../verification/verification.service';

@Module({
  providers: [UserResolver, UserService, VerificationService],
})
export class UserModule {}
