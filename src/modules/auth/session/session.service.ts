import { PrismaService } from '@/src/core/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginInput } from './inputs/login.inputs';
import { verify } from 'argon2';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { getSessionMetadata } from '@/src/shared/utils/session-metadata.util';
import { RedisService } from '@/src/core/redis/redis.service';
import { TOTP } from 'otpauth';
import { clearSession, saveSession } from '@/src/shared/utils/session.util';
@Injectable()
export class SessionService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  public async findSessionsByUser(req: Request) {
    const keys = await this.redisService.keys('*');

    const userSessions = [];

    for (const key of keys) {
      const sessionData = await this.redisService.get(key);

      if (sessionData) {
        const session = JSON.parse(sessionData);

        if (session.userId === req.session.userId) {
          userSessions.push({ ...session, id: key.split(':')[1] });
        }
      }
    }

    userSessions.sort((a, b) => b.createdAt - a.createdAt);

    return userSessions.filter((session) => session.id !== req.session.id);
  }

  public async findCurrentSession(req: Request) {
    const sessionData = await this.redisService.get(
      `${this.configService.getOrThrow<string>('SESSION_FOLDER')}${req.session.id}`,
    );

    const session = JSON.parse(sessionData);

    return { ...session, id: req.session.id };
  }

  public async login(req: Request, input: LoginInput, userAgent: string) {
    const { login, password, pin } = input;

    const user = await this.prismaService.user.findFirst({
      where: {
        OR: [{ name: { equals: login } }, { email: { equals: login } }],
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await verify(user.password, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    if (user.isTotpEnabled) {
      if (!pin) {
        return {
          message: 'pin is requred',
        };
      }

      const totp = new TOTP({
        issuer: 'TopicChat',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        secret: user.totpSecret,
      });

      const delta = totp.validate({ token: pin });

      if (delta === null) {
        throw new BadRequestException('Invalid TOTP code');
      }
    }

    const metadata = getSessionMetadata(req, userAgent);

    return await saveSession(req, user, metadata);
  }

  public async logout(req: Request) {
    return clearSession(req, this.configService);
  }

  public async clearSessionCookie(req: Request) {
    req.res.clearCookie(this.configService.getOrThrow<string>('SESSION_NAME'));

    return true;
  }

  public async remove(req: Request, id: string) {
    if (id === req.session.id) {
      throw new ConflictException('Cannot remove current session');
    }

    await this.redisService.del(
      `${this.configService.getOrThrow<string>('SESSION_FOLDER')}${id}`,
    );

    return true;
  }
}
