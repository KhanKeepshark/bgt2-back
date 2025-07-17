import { PrismaService } from '@back/src/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CronService {
  public constructor(private readonly prismaService: PrismaService) {}
}
