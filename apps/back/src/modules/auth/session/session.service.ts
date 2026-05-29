import { PrismaService } from '@back/core/prisma/prisma.service';
import { Prisma } from '@prisma/generated';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthError } from '@back/shared/constants/errors.constants';
import { TOTP_ISSUER } from '@back/shared/constants/totp.constants';
import { LoginInput } from './inputs/login.inputs';
import { verify } from 'argon2';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { getSessionMetadata } from '@back/shared/utils/session-metadata.util';
import { RedisService } from '@back/core/redis/redis.service';
import { TOTP } from 'otpauth';
import { clearSession, savePendingTotpSession, saveSession } from '@back/shared/utils/session.util';
import { UserService } from '../user/user.service';
import { LoginWithGoogleInput } from './inputs/login-with-google.input';
import { VerifyLoginTotpInput } from './inputs/verify-login-totp.input';

const sessionUserInclude = {
  accounts: true,
  tags: true,
  categories: {
    include: {
      children: true,
      keywords: true,
    },
  },
  subscriptionPlan: true,
} satisfies Prisma.UserInclude;

@Injectable()
export class SessionService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
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

  /** Успешный логин паролем / Google: +1 к счётчику и метка времени последнего входа. Impersonate сюда не входит. */
  private async applySuccessfulUserLogin(userId: string) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
      include: sessionUserInclude,
    });
  }

  public loginTotpPending(req: Request): boolean {
    return req.session.totpPending === true && !!req.session.userId;
  }

  public async login(req: Request, input: LoginInput, userAgent: string) {
    const { login, password } = input;

    const user = await this.prismaService.user.findFirst({
      where: {
        email: { equals: login },
      },
      include: sessionUserInclude,
    });

    if (!user) {
      throw new UnauthorizedException(AuthError.BAD_CREDENTIALS);
    }

    const isPasswordValid = await verify(user.password, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(AuthError.BAD_CREDENTIALS);
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(AuthError.EMAIL_NOT_VERIFIED);
    }

    const metadata = getSessionMetadata(req, userAgent);

    if (user.isTotpEnabled) {
      return await savePendingTotpSession(req, user.id, metadata);
    }

    const userWithLogin = await this.applySuccessfulUserLogin(user.id);

    return await saveSession(req, userWithLogin, metadata);
  }

  public async verifyLoginTotp(req: Request, input: VerifyLoginTotpInput) {
    const { pin } = input;

    if (!req.session.totpPending || !req.session.userId) {
      throw new UnauthorizedException(AuthError.UNAUTHORIZED);
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: req.session.userId },
      include: sessionUserInclude,
    });

    if (!user?.isTotpEnabled || !user.totpSecret) {
      throw new UnauthorizedException(AuthError.UNAUTHORIZED);
    }

    const totp = new TOTP({
      issuer: TOTP_ISSUER,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      secret: user.totpSecret,
    });

    const delta = totp.validate({ token: pin });

    if (delta === null) {
      throw new BadRequestException(AuthError.INVALID_TOTP);
    }

    const metadata = req.session.metadata ?? getSessionMetadata(req, '');
    const userWithLogin = await this.applySuccessfulUserLogin(user.id);

    return await saveSession(req, userWithLogin, metadata);
  }

  public async loginWithGoogle(
    req: Request,
    input: LoginWithGoogleInput,
    userAgent: string,
  ) {
    const { token, language } = input;

    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const googleUser = await response.json();
    const { email, name } = googleUser;

    if (!email) {
      throw new UnauthorizedException('Email not provided by Google');
    }

    let user = await this.prismaService.user.findFirst({
      where: { email: { equals: email } },
      include: sessionUserInclude,
    });

    if (!user) {
      user = await this.userService.createFromGoogle(
        email,
        name || 'User',
        language,
      );
    } else if (!user.isEmailVerified) {
      user = await this.prismaService.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
        include: sessionUserInclude,
      });
    }

    const metadata = getSessionMetadata(req, userAgent);
    const userWithLogin = await this.applySuccessfulUserLogin(user.id);

    return await saveSession(req, userWithLogin, metadata);
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
      throw new ConflictException(AuthError.SESSION_REMOVE_CURRENT);
    }

    await this.redisService.del(
      `${this.configService.getOrThrow<string>('SESSION_FOLDER')}${id}`,
    );

    return true;
  }

  public async impersonate(req: Request, userId: string, userAgent: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: sessionUserInclude,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const metadata = getSessionMetadata(req, userAgent);
    return await saveSession(req, user, metadata);
  }
}
