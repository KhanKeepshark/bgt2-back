import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNotificationInput } from './inputs/create-notification.input';
import { Notification, NotificationScope, User } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';

@Injectable()
export class NotificationService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(
    input: CreateNotificationInput,
    user: User,
  ): Promise<Notification> {
    try {
      const created = await this.prismaService.notification.create({
        data: {
          ...input,
          scope: NotificationScope.USER,
          user: { connect: { id: user.id } },
        },
      });

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to create notification');
      }

      throw error;
    }
  }

  public async findAllUser(user: User): Promise<Notification[]> {
    try {
      const [personal, global] = await Promise.all([
        this.prismaService.notification.findMany({
          where: {
            scope: NotificationScope.USER,
            userId: user.id,
            createdAt: { gte: user.createdAt },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.notification.findMany({
          where: {
            scope: NotificationScope.GLOBAL,
            createdAt: { gte: user.createdAt },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const readGlobalIds = new Set(user.readGlobalNotificationIds ?? []);

      const globalWithReadState = global.map((n) => ({
        ...n,
        isRead: readGlobalIds.has(n.id),
      }));

      // Сначала персональные, потом глобальные (или наоборот — по вкусу)
      return [...personal, ...globalWithReadState];
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find notifications');
      }

      throw error;
    }
  }

  public async findUnread(user: User): Promise<Notification[]> {
    try {
      const [personalUnread, global] = await Promise.all([
        this.prismaService.notification.findMany({
          where: {
            scope: NotificationScope.USER,
            userId: user.id,
            isRead: false,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prismaService.notification.findMany({
          where: { scope: NotificationScope.GLOBAL },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const readGlobalIds = new Set(user.readGlobalNotificationIds ?? []);

      const globalUnread = global
        .filter((n) => !readGlobalIds.has(n.id))
        .map((n) => ({
          ...n,
          isRead: false,
        }));

      return [...personalUnread, ...globalUnread];
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find unread notifications');
      }

      throw error;
    }
  }

  public async findOne(id: string, user: User): Promise<Notification> {
    try {
      const notification = await this.prismaService.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (
        notification.scope === NotificationScope.USER &&
        notification.userId !== user.id
      ) {
        throw new NotFoundException('Notification not found');
      }

      return notification;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to find notification');
      }

      throw error;
    }
  }

  public async markAsRead(id: string, user: User): Promise<Notification> {
    try {
      const notification = await this.findOne(id, user);

      if (notification.scope === NotificationScope.USER) {
        if (notification.isRead) {
          return notification;
        }

        const updated = await this.prismaService.notification.update({
          where: { id },
          data: { isRead: true },
        });

        return updated;
      }

      // GLOBAL: помечаем как прочитанное, добавив id в readGlobalNotificationIds
      const currentIds = new Set(user.readGlobalNotificationIds ?? []);
      if (!currentIds.has(notification.id)) {
        currentIds.add(notification.id);
        await this.prismaService.user.update({
          where: { id: user.id },
          data: {
            readGlobalNotificationIds: Array.from(currentIds),
          },
        });
      }

      return {
        ...notification,
        isRead: true,
      } as Notification;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to mark notification as read');
      }

      throw error;
    }
  }

  public async markAllAsRead(user: User): Promise<boolean> {
    try {
      // Персональные уведомления
      await this.prismaService.notification.updateMany({
        where: {
          scope: NotificationScope.USER,
          userId: user.id,
          isRead: false,
        },
        data: { isRead: true },
      });

      // Глобальные уведомления
      const global = await this.prismaService.notification.findMany({
        where: { scope: NotificationScope.GLOBAL },
        select: { id: true },
      });

      const existing = new Set(user.readGlobalNotificationIds ?? []);
      for (const n of global) {
        existing.add(n.id);
      }

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          readGlobalNotificationIds: Array.from(existing),
        },
      });

      return true;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to mark all notifications as read');
      }

      throw error;
    }
  }

  public async delete(id: string, user: User): Promise<boolean> {
    try {
      await this.findOne(id, user);

      await this.prismaService.notification.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException('Failed to delete notification');
      }

      throw error;
    }
  }
}
