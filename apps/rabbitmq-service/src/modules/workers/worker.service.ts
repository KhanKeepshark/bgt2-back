import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../libs/mail/mail.service';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class QueueWorkerService {
  public constructor(private readonly mailService: MailService) {}
  private readonly logger = new Logger(QueueWorkerService.name);

  async handleSendEmail(data: EmailJobData) {
    this.logger.log(`Processing email for: ${data.to}`);

    try {
      await this.mailService.sendMailDirect(data.to, data.subject, data.html);
      this.logger.debug(`Successfully sent email to ${data.to}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${data.to}: ${error}`);
    }

    return { success: true, messageId: Date.now() };
  }
}
