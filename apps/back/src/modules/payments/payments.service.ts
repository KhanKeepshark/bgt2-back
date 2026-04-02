import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePaymentInput } from './inputs/create-payment.input';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createPayment(userId: string, input: CreatePaymentInput) {
    const price = await this.prisma.subscriptionPrice.findUnique({
      where: { id: input.subscriptionPriceId },
    });

    if (!price) {
      throw new BadRequestException('Subscription price not found');
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        subscriptionPriceId: input.subscriptionPriceId,
        amount: price.price,
        currency: price.currency,
        status: 'PENDING',
      },
    });

    return payment;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: 'SUCCESS' | 'FAILED',
    externalId?: string,
  ) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        externalId,
      },
      include: { subscriptionPrice: { include: { plan: true } } },
    });

    if (status === 'SUCCESS' && payment.subscriptionPrice) {
      // Activate subscription for user
      const now = new Date();
      let expiresAt: Date | null = null;

      if (payment.subscriptionPrice.durationDays) {
        expiresAt = new Date(
          now.getTime() +
            payment.subscriptionPrice.durationDays * 24 * 60 * 60 * 1000,
        );
      }

      await this.prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionPlanId: payment.subscriptionPrice.planId,
          subscriptionPriceId: payment.subscriptionPrice.id,
          subscriptionStartedAt: now,
          subscriptionExpiresAt: expiresAt,
          // Add tokens if plan has them
          tokensBalance: {
            increment: payment.subscriptionPrice.plan.tokensOnPurchase,
          },
        },
      });
    }

    return payment;
  }
}
