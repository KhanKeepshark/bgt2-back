import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { PaymentsService } from './payments.service';
import { PaymentModel } from './models/payment.model';
import { CreatePaymentInput } from './inputs/create-payment.input';
import { Authorization } from '@back/shared/decorators/auth.decorator';
import { Authorized } from '@back/shared/decorators/authorized.decorator';

@Resolver(() => PaymentModel)
export class PaymentsResolver {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Authorization()
  @Mutation(() => PaymentModel)
  async createPayment(
    @Args('input') input: CreatePaymentInput,
    @Authorized('id') id: string,
  ) {
    return this.paymentsService.createPayment(id, input);
  }

  @Authorization()
  @Mutation(() => PaymentModel)
  async confirmPayment(
      @Args('paymentId') paymentId: string,
      @Args('transactionId') transactionId: string,
  ) {
      return this.paymentsService.updatePaymentStatus(paymentId, 'SUCCESS', transactionId);
  }
}
