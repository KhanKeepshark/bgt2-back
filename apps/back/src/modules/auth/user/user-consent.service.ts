import { ConsentType } from '@prisma/generated';
import { PrismaService } from '@back/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { LEGAL_DOCUMENT_VERSION } from '@back/shared/constants/legal.constants';

const REQUIRED_LEGAL_CONSENT_TYPES: ConsentType[] = [
  ConsentType.TERMS,
  ConsentType.PRIVACY,
  ConsentType.CROSS_BORDER_PD,
];

export type RecordConsentInput = {
  type: ConsentType;
  version: string;
};

@Injectable()
export class UserConsentService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async hasRequiredLegalConsents(userId: string): Promise<boolean> {
    const consents = await this.prismaService.userConsent.findMany({
      where: {
        userId,
        type: { in: REQUIRED_LEGAL_CONSENT_TYPES },
      },
      select: { type: true },
    });

    const acceptedTypes = new Set(consents.map((consent) => consent.type));

    return REQUIRED_LEGAL_CONSENT_TYPES.every((type) =>
      acceptedTypes.has(type),
    );
  }

  public async recordConsents(
    userId: string,
    consents: RecordConsentInput[],
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (consents.length === 0) {
      return;
    }

    await this.prismaService.userConsent.createMany({
      data: consents.map((consent) => ({
        userId,
        type: consent.type,
        version: consent.version,
        ipAddress,
        userAgent,
      })),
    });
  }

  public buildRegistrationConsents(input: {
    termsVersion: string;
    privacyVersion: string;
    crossBorderVersion: string;
  }): RecordConsentInput[] {
    return [
      { type: ConsentType.TERMS, version: input.termsVersion },
      { type: ConsentType.PRIVACY, version: input.privacyVersion },
      {
        type: ConsentType.CROSS_BORDER_PD,
        version: input.crossBorderVersion,
      },
    ];
  }

  /** Records only missing required consents (implicit auth acceptance). */
  public async ensureRequiredLegalConsents(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const consents = await this.prismaService.userConsent.findMany({
      where: {
        userId,
        type: { in: REQUIRED_LEGAL_CONSENT_TYPES },
      },
      select: { type: true },
    });

    const acceptedTypes = new Set(consents.map((consent) => consent.type));
    const missingTypes = REQUIRED_LEGAL_CONSENT_TYPES.filter(
      (type) => !acceptedTypes.has(type),
    );

    if (missingTypes.length === 0) {
      return;
    }

    await this.recordConsents(
      userId,
      missingTypes.map((type) => ({
        type,
        version: LEGAL_DOCUMENT_VERSION,
      })),
      ipAddress,
      userAgent,
    );
  }
}
