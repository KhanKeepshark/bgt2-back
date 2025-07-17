import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { Global } from '@nestjs/common';

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
