import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSupportTicketInput } from './inputs/create-support-ticket.input';
import { ReplySupportTicketInput } from './inputs/reply-support-ticket.input';
import { RabbitmqService } from '../../core/rabbitmq/rabbitmq.service';
import { SupportTicketStatus } from '@prisma/generated';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  public async createTicket(input: CreateSupportTicketInput, userId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const whereClause: any = {
      createdAt: {
        gte: startOfDay,
      },
    };

    if (userId) {
      whereClause.OR = [{ email: input.email }, { userId }];
    } else {
      whereClause.email = input.email;
    }

    const ticketsToday = await this.prisma.supportTicket.count({
      where: whereClause,
    });

    if (ticketsToday >= 3) {
      throw new BadRequestException('limit_exceeded');
    }

    return this.prisma.supportTicket.create({
      data: {
        email: input.email,
        message: input.message,
        userId,
      },
    });
  }

  public async replyToTicket(input: ReplySupportTicketInput) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: input.id },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const updatedTicket = await this.prisma.supportTicket.update({
      where: { id: input.id },
      data: {
        replyMessage: input.replyMessage,
        status: SupportTicketStatus.RESOLVED,
      },
    });

    // Отправляем письмо пользователю через RabbitMQ
    await this.rabbitmqService.addEmailJob({
      to: ticket.email,
      subject: 'Re: Your Support Request',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hello,</p>
          <p>You recently contacted our support team with the following message:</p>
          <blockquote style="border-left: 4px solid #ddd; padding-left: 10px; color: #555;">
            ${ticket.message.replace(/\n/g, '<br>')}
          </blockquote>
          <p><strong>Our reply:</strong></p>
          <p style="white-space: pre-wrap;">${input.replyMessage}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.9em; color: #777;">Best regards,<br>Support Team</p>
        </div>
      `,
    });

    return updatedTicket;
  }

  public async findAll() {
    return this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  public async deleteTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    await this.prisma.supportTicket.delete({
      where: { id },
    });

    return true;
  }
}
