import type { User } from '@/prisma/generated';
import type { SessionMetadata } from '../types/session-metadata.types';
import type { Request } from 'express';
import { InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

export function saveSession(
  req: Request,
  user: User,
  metadata: SessionMetadata,
) {
  return new Promise((resolve, reject) => {
    req.session.userId = user.id;
    req.session.createdAt = new Date();
    req.session.metadata = metadata;

    req.session.save((err) => {
      if (err) {
        return reject(
          new InternalServerErrorException('Failed to save session'),
        );
      }

      resolve({ user });
    });
  });
}

export function clearSession(req: Request, configService: ConfigService) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        return reject(
          new InternalServerErrorException('Failed to destroy session'),
        );
      }

      req.res.clearCookie(configService.getOrThrow<string>('SESSION_NAME'));
      resolve(true);
    });
  });
}
