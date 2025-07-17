import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class RabbitmqService {
  private readonly logger = new Logger(RabbitmqService.name);
  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly client: ClientProxy,
  ) {}

  async addEmailJob(data: EmailJobData) {
    this.logger.debug(`Queuing email for ${data.to}`);
    try {
      const result = await this.client.emit('send_email', data);
      this.logger.debug(`Email queued successfully:`, result);
    } catch (error) {
      this.logger.error(`Failed to queue email:`, error);
    }
  }
}
