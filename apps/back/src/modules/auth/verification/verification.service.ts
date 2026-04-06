import { PrismaService } from '@back/core/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthError } from '@back/shared/constants/errors.constants';
import { MailService } from '../../libs/mail/mail.service';
import { VerificationInput } from './inputs/verification.input';
import { TokenType, User } from '@prisma/generated';
import { getSessionMetadata } from '@back/shared/utils/session-metadata.util';
import { saveSession } from '@back/shared/utils/session.util';
import { Request } from 'express';
import { generateToken } from '@back/shared/utils/generate-token.util';

@Injectable()
export class VerificationService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  public async verify(
    input: VerificationInput,
    req: Request,
    userAgent: string,
  ) {
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

    const user = await this.prismaService.user.update({
      where: { id: existingToken.userId },
      data: {
        isEmailVerified: true,
      },
    });

    await this.prismaService.token.delete({
      where: { id: existingToken.id, type: TokenType.EMAIL_VERIFY },
    });

    const metadata = getSessionMetadata(req, userAgent);

    return saveSession(req, user, metadata);
  }

  public async sendVerificationEmail(user: User, language?: string) {
    const verificationToken = await generateToken(
      this.prismaService,
      TokenType.EMAIL_VERIFY,
      user,
      true,
    );

    await this.mailService.sendVerificationEmail(
      user.email,
      verificationToken.token,
      language,
    );

    return true;
  }
}
