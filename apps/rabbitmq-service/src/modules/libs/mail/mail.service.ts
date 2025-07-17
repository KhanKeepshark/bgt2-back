import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  public constructor(private readonly mailerService: MailerService) {}

  public async sendMailDirect(email: string, subject: string, html: string) {
    console.log('email sended');
    return this.mailerService.sendMail({
      to: email,
      subject,
      html,
    });
  }
}
