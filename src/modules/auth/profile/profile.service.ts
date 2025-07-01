import { User } from '@/prisma/generated';
import { PrismaService } from '@/src/core/prisma/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';
import * as Upload from 'graphql-upload/Upload.js';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { ChangeProfileInfoInput } from './inputs/change-profile-info.input';

@Injectable()
export class ProfileService {
  public constructor(private readonly prisma: PrismaService) {}

  public async changeAvatar(user: User, file: Upload) {
    if (user.avatar) {
      const avatarPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        user.avatar,
      );

      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    const chunks: Buffer[] = [];

    for await (const chunk of file.createReadStream()) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    let processedBuffer: Buffer;

    if (file.filename && file.filename.endsWith('.gif')) {
      processedBuffer = await sharp(buffer, { animated: true })
        .resize(512, 512)
        .webp()
        .toBuffer();
    } else {
      processedBuffer = await sharp(buffer).resize(512, 512).webp().toBuffer();
    }

    const uniqueName = `${user.id}-${Date.now()}.webp`;
    const uploadDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'uploads',
      'avatars',
    );
    const uploadPath = path.join(uploadDir, uniqueName);

    fs.mkdirSync(uploadDir, { recursive: true });

    fs.writeFileSync(uploadPath, processedBuffer);

    const avatarUrl = `/uploads/avatars/${uniqueName}`;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { avatar: avatarUrl },
    });

    return true;
  }

  public async deleteAvatar(user: User) {
    if (!user.avatar) {
      return;
    }

    const avatarPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      user.avatar,
    );

    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { avatar: null },
    });

    return true;
  }

  public async changeProfileInfo(user: User, input: ChangeProfileInfoInput) {
    const { name } = input;

    const existingUsername = await this.prisma.user.findUnique({
      where: { name },
    });

    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { name },
    });

    return true;
  }
}
