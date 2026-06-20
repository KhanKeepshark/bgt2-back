import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthError } from '@back/shared/constants/errors.constants';
import { EMAIL_VERIFY_TTL_MINUTES } from '@back/shared/constants/auth-token.constants';
import { MailService } from '../../libs/mail/mail.service';
import { VerificationInput } from './inputs/verification.input';
import { ResendVerificationInput } from './inputs/resend-verification.input';
import { TokenType, User } from '@prisma/generated';
import { generateToken } from '@back/shared/utils/generate-token.util';
import { VerificationResendStatus } from './models/verification-resend-status.model';

@Injectable()
export class VerificationService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  public async verify(input: VerificationInput) {
    const { token } = input;

    const existingToken = await this.prismaService.token.findUnique({
      where: { token, type: TokenType.EMAIL_VERIFY },
    });

    if (!existingToken) {
      throw new NotFoundException(AuthError.TOKEN_NOT_FOUND);
    }

    const hasExpired = new Date(existingToken.expiresAt) < new Date();

    if (hasExpired) {
      throw new BadRequestException(AuthError.TOKEN_EXPIRED);
    }

    await this.prismaService.user.update({
      where: { id: existingToken.userId },
      data: {
        isEmailVerified: true,
      },
    });

    await this.prismaService.token.delete({
      where: { id: existingToken.id, type: TokenType.EMAIL_VERIFY },
    });

    return true;
  }

  public async sendVerificationEmail(user: User, language?: string) {
    const verificationToken = await generateToken(
      this.prismaService,
      TokenType.EMAIL_VERIFY,
      user,
      true,
      EMAIL_VERIFY_TTL_MINUTES,
    );

    await this.mailService.sendVerificationEmail(
      user.email,
      verificationToken.token,
      language,
    );

    return true;
  }

  public async getResendStatus(
    email?: string,
    token?: string,
  ): Promise<VerificationResendStatus> {
    if (!email && !token) {
      throw new BadRequestException(AuthError.BAD_CREDENTIALS);
    }

    const { user, verificationToken } = await this.resolveVerificationContext(
      email,
      token,
    );

    if (!user || user.isEmailVerified) {
      return {
        canResend: false,
        nextResendAt: null,
        tokenExpired: false,
      };
    }

    if (!verificationToken) {
      return {
        canResend: true,
        nextResendAt: null,
        tokenExpired: true,
      };
    }

    return this.buildResendStatus(verificationToken);
  }

  public async resendVerificationEmail(input: ResendVerificationInput) {
    const { email, token, language } = input;

    if (!email && !token) {
      throw new BadRequestException(AuthError.BAD_CREDENTIALS);
    }

    const { user, verificationToken } = await this.resolveVerificationContext(
      email,
      token,
    );

    if (!user || user.isEmailVerified) {
      return true;
    }

    if (verificationToken) {
      const status = this.buildResendStatus(verificationToken);

      if (!status.canResend) {
        throw new BadRequestException(AuthError.VERIFICATION_RESEND_TOO_EARLY);
      }
    }

    await this.sendVerificationEmail(user, language);

    return true;
  }

  private buildResendStatus(verificationToken: {
    createdAt: Date;
    expiresAt: Date;
  }): VerificationResendStatus {
    const tokenExpired = new Date(verificationToken.expiresAt) < new Date();
    const nextResendAt = this.getNextResendAt(verificationToken.createdAt);
    const canResend = tokenExpired && nextResendAt <= new Date();

    return {
      canResend,
      nextResendAt: canResend ? null : nextResendAt,
      tokenExpired,
    };
  }

  private getNextResendAt(createdAt: Date) {
    return new Date(createdAt.getTime() + EMAIL_VERIFY_TTL_MINUTES * 60 * 1000);
  }

  private async resolveVerificationContext(email?: string, token?: string) {
    if (token) {
      const verificationToken = await this.prismaService.token.findUnique({
        where: { token, type: TokenType.EMAIL_VERIFY },
        include: { user: true },
      });

      return {
        user: verificationToken?.user ?? null,
        verificationToken,
      };
    }

    const user = email
      ? await this.prismaService.user.findUnique({ where: { email } })
      : null;

    if (!user) {
      return { user: null, verificationToken: null };
    }

    const verificationToken = await this.prismaService.token.findFirst({
      where: {
        userId: user.id,
        type: TokenType.EMAIL_VERIFY,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { user, verificationToken };
  }
}
