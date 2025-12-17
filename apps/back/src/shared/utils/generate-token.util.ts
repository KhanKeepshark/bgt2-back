import type { TokenType, User } from '@prisma/generated';
import type { PrismaService } from '@back/core/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export async function generateToken(
  prismaService: PrismaService,
  type: TokenType,
  user: User,
  isUUID: boolean = false,
) {
  let token: string;

  if (isUUID) {
    token = uuidv4();
  } else {
    token = Math.floor(Math.random() * (1000000 - 100000) + 100000).toString();
  }

  const expiresAt = new Date(new Date().getTime() + 1000 * 60 * 5);

  const existingToken = await prismaService.token.findFirst({
    where: {
      userId: user.id,
      type,
    },
  });

  if (existingToken) {
    await prismaService.token.delete({
      where: {
        id: existingToken.id,
      },
    });
  }

  const newToken = await prismaService.token.create({
    data: {
      token,
      type,
      expiresAt,
      user: {
        connect: {
          id: user.id,
        },
      },
    },
    include: {
      user: true,
    },
  });

  return newToken;
}
