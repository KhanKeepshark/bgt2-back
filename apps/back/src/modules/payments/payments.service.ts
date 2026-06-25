import { Injectable, BadRequestException } from '@nestjs/common';
import { SubscriptionType } from '@prisma/generated';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePaymentInput } from './inputs/create-payment.input';
import { ConfigService } from '@nestjs/config';
import { SubscriptionError } from '@back/shared/constants/errors.constants';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private assertPremiumSalesEnabled(): void {
    const enabled =
      this.configService.get<string>('PREMIUM_SALES_ENABLED') === 'true';
    if (!enabled) {
      throw new BadRequestException(SubscriptionError.SALES_DISABLED);
    }
  }

  async createPayment(userId: string, input: CreatePaymentInput) {
    this.assertPremiumSalesEnabled();
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
    const existingPayment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { subscriptionPrice: { include: { plan: true } } },
    });

    if (!existingPayment) {
      throw new BadRequestException('Payment not found');
    }

    if (existingPayment.status === 'SUCCESS' && status === 'SUCCESS') {
      return existingPayment;
    }

    // Block confirming a payment while sales are disabled, before writing
    // SUCCESS — otherwise the row flips to SUCCESS but Premium is never granted.
    if (status === 'SUCCESS') {
      this.assertPremiumSalesEnabled();
    }

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        externalId,
      },
      include: { subscriptionPrice: { include: { plan: true } } },
    });

    if (status === 'SUCCESS' && payment.subscriptionPrice) {
      const now = new Date();
      let expiresAt: Date | null = null;

      if (payment.subscriptionPrice.durationDays) {
        expiresAt = new Date(
          now.getTime() +
            payment.subscriptionPrice.durationDays * 24 * 60 * 60 * 1000,
        );
      }

      const priorSuccessfulPremiumPayments = await this.prisma.payment.count({
        where: {
          userId: payment.userId,
          status: 'SUCCESS',
          id: { not: payment.id },
          subscriptionPrice: {
            plan: { type: SubscriptionType.PREMIUM },
          },
        },
      });

      const isFirstPremiumPurchase = priorSuccessfulPremiumPayments === 0;
      const tokensOnPurchase = payment.subscriptionPrice.plan.tokensOnPurchase;

      await this.prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionPlanId: payment.subscriptionPrice.planId,
          subscriptionPriceId: payment.subscriptionPrice.id,
          subscriptionStartedAt: now,
          subscriptionExpiresAt: expiresAt,
          subscriptionAutoRenew: true,
          ...(isFirstPremiumPurchase && tokensOnPurchase > 0
            ? {
                tokensBalance: {
                  increment: tokensOnPurchase,
                },
              }
            : {}),
        },
      });
    }

    return payment;
  }
}
