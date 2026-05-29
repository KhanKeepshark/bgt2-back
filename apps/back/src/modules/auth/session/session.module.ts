import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionResolver } from './session.resolver';
import { UserModule } from '../user/user.module';
import { GqlTotpPendingGuard } from '@back/shared/guards/gql-totp-pending.guard';

@Module({
  imports: [UserModule],
  providers: [SessionResolver, SessionService, GqlTotpPendingGuard],
})
export class SessionModule {}
