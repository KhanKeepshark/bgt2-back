import { Controller } from '@nestjs/common';
import { EmailJobData, QueueWorkerService } from './worker.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class WorkerController {
  constructor(private readonly workerService: QueueWorkerService) {}

  @MessagePattern('send_email')
  async handleSendEmail(@Payload() data: EmailJobData) {
    return this.workerService.handleSendEmail(data);
  }
}
