import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthError } from '@back/shared/constants/errors.constants';
import { TOTP_ISSUER } from '@back/shared/constants/totp.constants';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { encode } from 'hi-base32';
import { User } from '@prisma/generated';
import { randomBytes } from 'crypto';
import { TOTP } from 'otpauth';
import * as QRCode from 'qrcode';
import { EnableTotpInput } from './inputs/enable-totp.input';

@Injectable()
export class TotpService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async generateTotpSecret(user: User) {
    const secret = encode(randomBytes(32)).replace(/=/g, '').substring(0, 24);

    const totp = new TOTP({
      issuer: TOTP_ISSUER,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      secret,
    });

    const otpAuthUrl = totp.toString();
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    return {
      secret,
      qrCodeUrl,
    };
  }

  public async enable(user: User, input: EnableTotpInput) {
    const { secret, pin } = input;

    const totp = new TOTP({
      issuer: TOTP_ISSUER,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      secret,
    });

    const delta = totp.validate({ token: pin });

    if (delta === null) {
      throw new BadRequestException(AuthError.INVALID_TOTP);
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        totpSecret: secret,
        isTotpEnabled: true,
      },
    });

    return true;
  }

  public async disable(user: User) {
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        totpSecret: null,
        isTotpEnabled: false,
      },
    });

    return true;
  }

  public verifyPin(user: User, pin: string): void {
    if (!user.isTotpEnabled || !user.totpSecret) {
      throw new UnauthorizedException(AuthError.INVALID_TOTP);
    }

    const totp = new TOTP({
      issuer: TOTP_ISSUER,
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      secret: user.totpSecret,
    });

    if (totp.validate({ token: pin }) === null) {
      throw new BadRequestException(AuthError.INVALID_TOTP);
    }
  }
}
