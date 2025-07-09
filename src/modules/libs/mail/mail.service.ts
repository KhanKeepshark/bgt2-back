import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { VerificationTemplate } from './templates/verification.template';

@Injectable()
export class MailService {
  public constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  public async sendVerificationEmail(email: string, token: string) {
    const domain = this.configService.getOrThrow<string>('ALLOWED_ORIGINS');
    const html = await render(VerificationTemplate({ domain, token }));

    this.sendMail(email, 'Verify your email', html);
  }

  private sendMail(email: string, subject: string, html: string) {
    this.mailerService.sendMail({
      to: email,
      subject,
      html,
    });
  }
}
