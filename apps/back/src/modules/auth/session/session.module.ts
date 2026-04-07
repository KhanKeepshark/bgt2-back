import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionResolver } from './session.resolver';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [SessionResolver, SessionService],
})
export class SessionModule {}
