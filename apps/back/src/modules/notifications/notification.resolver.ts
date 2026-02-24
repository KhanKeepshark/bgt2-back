import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { NotificationService } from './notification.service';
import { NotificationModel } from './models/notification.model';
import { CreateNotificationInput } from './inputs/create-notification.input';
import { Authorization, AdminOnly } from '@back/shared/decorators/auth.decorator';
import { Authorized } from '@back/shared/decorators/authorized.decorator';
import { User } from '@prisma/generated';

@Resolver('Notification')
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @AdminOnly()
  @Query(() => [NotificationModel], { name: 'findAllAdminNotifications' })
  public async findAllAdminNotifications() {
    return this.notificationService.findAllAdmin();
  }

  @AdminOnly()
  @Mutation(() => NotificationModel, { name: 'createNotification' })
  public async createNotification(
    @Args('input') input: CreateNotificationInput,
  ) {
    return this.notificationService.create(input);
  }

  @Authorization()
  @Query(() => [NotificationModel], { name: 'findAllUserNotifications' })
  public async findAllUserNotifications(@Authorized() user: User) {
    return this.notificationService.findAllUser(user);
  }

  @Authorization()
  @Query(() => [NotificationModel], { name: 'findUnreadNotifications' })
  public async findUnreadNotifications(@Authorized() user: User) {
    return this.notificationService.findUnread(user);
  }

  @Authorization()
  @Query(() => NotificationModel, { name: 'findOneNotification' })
  public async findOneNotification(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.notificationService.findOne(id, user);
  }

  @Authorization()
  @Mutation(() => NotificationModel, { name: 'markNotificationAsRead' })
  public async markNotificationAsRead(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.notificationService.markAsRead(id, user);
  }

  @Authorization()
  @Mutation(() => Boolean, { name: 'markAllNotificationsAsRead' })
  public async markAllNotificationsAsRead(@Authorized() user: User) {
    return this.notificationService.markAllAsRead(user);
  }

  @AdminOnly()
  @Mutation(() => Boolean, { name: 'deleteNotification' })
  public async deleteNotification(
    @Args('id') id: string,
    @Authorized() user: User,
  ) {
    return this.notificationService.delete(id, user);
  }
}
