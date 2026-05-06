import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { SupportService } from './support.service';
import { SupportTicket } from './models/support-ticket.model';
import { CreateSupportTicketInput } from './inputs/create-support-ticket.input';
import { ReplySupportTicketInput } from './inputs/reply-support-ticket.input';
import { Authorized } from '../../shared/decorators/authorized.decorator';
import { AdminOnly } from '../../shared/decorators/auth.decorator';
import { User } from '@prisma/generated';

@Resolver(() => SupportTicket)
export class SupportResolver {
  constructor(private readonly supportService: SupportService) {}

  @Mutation(() => SupportTicket)
  public async createSupportTicket(
    @Args('input') input: CreateSupportTicketInput,
    @Authorized() user?: User,
  ) {
    return this.supportService.createTicket(input, user?.id);
  }

  @Query(() => [SupportTicket])
  @AdminOnly()
  public async findAllSupportTickets() {
    return this.supportService.findAll();
  }

  @Mutation(() => SupportTicket)
  @AdminOnly()
  public async replyToSupportTicket(
    @Args('input') input: ReplySupportTicketInput,
  ) {
    return this.supportService.replyToTicket(input);
  }

  @Mutation(() => Boolean)
  @AdminOnly()
  public async deleteSupportTicket(@Args('id') id: string) {
    await this.supportService.deleteTicket(id);
    return true;
  }
}
