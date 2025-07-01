import { PrismaService } from '@/src/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class CronService {
  public constructor(private readonly prismaService: PrismaService) {}

  @Cron('0 0 * * 0')
  public async removeDeletedUsersAvatars() {
    const avatarsDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'uploads',
      'avatars',
    );

    if (!fs.existsSync(avatarsDir)) return;

    const files = fs.readdirSync(avatarsDir);

    for (const file of files) {
      const avatarPath = `/uploads/avatars/${file}`;
      const user = await this.prismaService.user.findFirst({
        where: { avatar: avatarPath },
        select: { id: true },
      });

      if (!user) {
        fs.unlinkSync(path.join(avatarsDir, file));
        console.log(`Deleted orphaned avatar: ${file}`);
      }
    }
  }
}
