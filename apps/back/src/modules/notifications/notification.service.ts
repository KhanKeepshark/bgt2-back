import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNotificationInput } from './inputs/create-notification.input';
import { Notification, NotificationScope, User } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { NotificationError } from '@back/shared/constants/errors.constants';

@Injectable()
export class NotificationService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async create(input: CreateNotificationInput): Promise<Notification> {
    try {
      const scope = input.scope ?? NotificationScope.USER;
      const isGlobal = scope === NotificationScope.GLOBAL;

      if (!isGlobal && !input.userId) {
        throw new BadRequestException(NotificationError.USER_ID_REQUIRED);
      }

      const hasAtLeastOne = (obj: { en?: string; ru?: string; kz?: string }) =>
        [obj.en, obj.ru, obj.kz].some(
          (v) => v != null && String(v).trim().length > 0,
        );
      if (!hasAtLeastOne(input.description)) {
        throw new BadRequestException(
          NotificationError.AT_LEAST_ONE_LANGUAGE_REQUIRED,
        );
      }

      const normalizeLocalized = (obj?: {
        en?: string;
        ru?: string;
        kz?: string;
      }) => ({
        en: obj?.en?.trim() ? obj.en.trim() : null,
        ru: obj?.ru?.trim() ? obj.ru.trim() : null,
        kz: obj?.kz?.trim() ? obj.kz.trim() : null,
      });

      const titleJson = normalizeLocalized(input.title);
      const descriptionJson = normalizeLocalized(input.description);
      const buttonTextJson = normalizeLocalized(input.buttonText);

      const created = await this.prismaService.notification.create({
        data: {
          title: titleJson,
          description: descriptionJson,
          link: input.link,
          buttonText: buttonTextJson,
          scope,
          ...(isGlobal
            ? { userId: null }
            : { user: { connect: { id: input.userId } } }),
        },
      });

      return created;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(NotificationError.CREATION_FAILED);
      }

      throw error;
    }
  }

  public async findAllAdmin(): Promise<Notification[]> {
    try {
      return this.prismaService.notification.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(NotificationError.FIND_FAILED);
      }

      throw error;
    }
  }

  public async findAllUser(user: User): Promise<Notification[]> {
    try {
      const readGlobalIds = await this.getReadGlobalNotificationIds(user.id);

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

      const globalWithReadState = global.map((n) => ({
        ...n,
        isRead: readGlobalIds.has(n.id),
      }));

      return [...personal, ...globalWithReadState];
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(NotificationError.FIND_FAILED);
      }

      throw error;
    }
  }

  public async findUnread(user: User): Promise<Notification[]> {
    try {
      const readGlobalIds = await this.getReadGlobalNotificationIds(user.id);

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
          where: {
            scope: NotificationScope.GLOBAL,
            createdAt: { gte: user.createdAt },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const globalUnread = global
        .filter((n) => !readGlobalIds.has(n.id))
        .map((n) => ({
          ...n,
          isRead: false,
        }));

      return [...personalUnread, ...globalUnread];
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(NotificationError.FIND_FAILED);
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
        throw new NotFoundException(NotificationError.NOT_FOUND);
      }

      if (
        notification.scope === NotificationScope.USER &&
        notification.userId !== user.id
      ) {
        throw new NotFoundException(NotificationError.NOT_FOUND);
      }

      return notification;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(NotificationError.FIND_FAILED);
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

      await this.markGlobalAsRead(user.id, id);

      return {
        ...notification,
        isRead: true,
      } as Notification;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(NotificationError.MARK_READ_FAILED);
      }

      throw error;
    }
  }

  public async markAllAsRead(user: User): Promise<boolean> {
    try {
      await this.prismaService.notification.updateMany({
        where: {
          scope: NotificationScope.USER,
          userId: user.id,
          isRead: false,
        },
        data: { isRead: true },
      });

      const unreadGlobals = await this.prismaService.notification.findMany({
        where: {
          scope: NotificationScope.GLOBAL,
          createdAt: { gte: user.createdAt },
          inboxMessageReads: { none: { userId: user.id } },
        },
        select: { id: true },
      });

      if (unreadGlobals.length > 0) {
        await this.prismaService.inboxMessageRead.createMany({
          data: unreadGlobals.map(({ id }) => ({
            userId: user.id,
            notificationId: id,
          })),
          skipDuplicates: true,
        });
      }

      return true;
    } catch (error) {
      if (error?.code?.startsWith('P')) {
        throw new BadRequestException(NotificationError.MARK_ALL_READ_FAILED);
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
        throw new BadRequestException(NotificationError.DELETION_FAILED);
      }

      throw error;
    }
  }

  private async getReadGlobalNotificationIds(
    userId: string,
  ): Promise<Set<string>> {
    const rows = await this.prismaService.inboxMessageRead.findMany({
      where: { userId },
      select: { notificationId: true },
    });

    return new Set(rows.map((row) => row.notificationId));
  }

  private async markGlobalAsRead(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    await this.prismaService.inboxMessageRead.upsert({
      where: {
        userId_notificationId: { userId, notificationId },
      },
      create: { userId, notificationId },
      update: {},
    });
  }
}
