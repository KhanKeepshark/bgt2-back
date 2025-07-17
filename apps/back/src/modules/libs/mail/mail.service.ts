import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { VerificationTemplate } from './templates/verification.template';
import { RabbitmqService } from '../../../core/rabbitmq/rabbitmq.service';

@Injectable()
export class MailService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  public async sendVerificationEmail(email: string, token: string) {
    const domain = this.configService.getOrThrow<string>('ALLOWED_ORIGINS');
    const html = await render(VerificationTemplate({ domain, token }));

    this.rabbitmqService.addEmailJob({
      to: email,
      subject: 'Verify your email',
      html,
    });

    return true;
  }
}
