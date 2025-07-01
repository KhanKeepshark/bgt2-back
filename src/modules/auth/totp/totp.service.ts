import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/src/core/prisma/prisma.service';
import { encode } from 'hi-base32';
import { User } from '@/prisma/generated';
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
      issuer: 'TopicChat',
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
      issuer: 'TopicChat',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      secret,
    });

    const delta = totp.validate({ token: pin });

    if (delta === null) {
      throw new BadRequestException('Invalid TOTP code');
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
}
