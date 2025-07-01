jest.mock('geoip-lite', () => ({
  lookup: jest.fn().mockReturnValue({
    country: 'US',
    city: 'New York',
    ll: [40.7128, -74.006],
  }),
}));

jest.mock('otpauth', () => ({
  TOTP: jest.fn().mockImplementation(() => ({
    validate: () => null,
  })),
}));

jest.mock('@/src/shared/utils/session.util', () => ({
  saveSession: jest.fn(),
}));

jest.mock('argon2', () => ({
  verify: jest.fn(),
}));

import { SessionService } from '../session.service';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { verify } from 'argon2';
import { saveSession } from '@/src/shared/utils/session.util';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: any;
  let redis: any;
  let config: any;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
      },
    };
    config = {
      getOrThrow: jest.fn().mockReturnValue('dummy'),
    };

    service = new SessionService(prisma, redis, config);
  });

  it('should throw NotFoundException if user not found', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.login({} as any, { login: 'foo', password: 'bar' }, 'agent'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw UnauthorizedException if password is invalid', async () => {
    prisma.user.findFirst.mockResolvedValue({ password: 'hashed' });
    (verify as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({} as any, { login: 'foo', password: 'bar' }, 'agent'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw BadRequestException if TOTP is enabled and pin is invalid', async () => {
    prisma.user.findFirst.mockResolvedValue({
      password: 'hashed',
      isTotpEnabled: true,
      totpSecret: 'secret',
      email: 'test@example.com',
    });
    (verify as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login(
        {} as any,
        { login: 'foo', password: 'bar', pin: '123456' },
        'agent',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return session if login is successful', async () => {
    const user = {
      id: '1',
      name: 'foo',
      email: 'foo@bar.com',
      password: 'hashed',
      isTotpEnabled: false,
    };
    prisma.user.findFirst.mockResolvedValue(user);
    (verify as jest.Mock).mockResolvedValue(false);

    // Set up the mock for saveSession to return a fake session object
    const sessionResult = { user, message: null };
    (saveSession as jest.Mock).mockResolvedValue(sessionResult);

    const result = await service.login(
      { session: {}, headers: {} } as any,
      { login: 'foo', password: 'bar' },
      'agent',
    );

    expect(result).toEqual(sessionResult);
    expect(saveSession).toHaveBeenCalledWith(
      expect.any(Object), // req
      user,
      expect.any(Object), // metadata
    );
  });
});
