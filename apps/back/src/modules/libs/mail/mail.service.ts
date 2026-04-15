import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { VerificationTemplate } from './templates/verification.template';
import { PasswordResetTemplate } from './templates/password-reset.template';
import { RabbitmqService } from '../../../core/rabbitmq/rabbitmq.service';

@Injectable()
export class MailService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  public async sendVerificationEmail(
    email: string,
    token: string,
    language?: string,
  ) {
    const allowedOrigins =
      this.configService.getOrThrow<string>('ALLOWED_ORIGINS');
    const domain = allowedOrigins.split(',')[0];
    const html = await render(
      VerificationTemplate({ domain, token, language }),
    );

    let subject = 'Verify your email';
    if (language === 'ru') {
      subject = 'Подтвердите вашу электронную почту';
    } else if (language === 'kz') {
      subject = 'Электрондық поштаңызды растаңыз';
    }

    this.rabbitmqService.addEmailJob({
      to: email,
      subject,
      html,
    });

    return true;
  }

  public async sendPasswordResetEmail(
    email: string,
    token: string,
    language?: string,
  ) {
    const allowedOrigins =
      this.configService.getOrThrow<string>('ALLOWED_ORIGINS');
    const domain = allowedOrigins.split(',')[0];
    const html = await render(
      PasswordResetTemplate({ domain, token, language }),
    );

    let subject = 'Reset your password';
    if (language === 'ru') {
      subject = 'Сброс пароля';
    } else if (language === 'kz') {
      subject = 'Құпия сөзді қалпына келтіру';
    }

    this.rabbitmqService.addEmailJob({
      to: email,
      subject,
      html,
    });

    return true;
  }
}
