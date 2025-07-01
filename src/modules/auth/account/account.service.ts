import { PrismaService } from '@/src/core/prisma/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserInput } from './inputs/create-user.input';
import { hash } from 'argon2';
import { Role } from './models/user.model';
@Injectable()
export class AccountService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async findAll() {
    const users = await this.prismaService.user.findMany();

    return users;
  }

  public async me(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });

    return user;
  }

  public async create(input: CreateUserInput) {
    const { email, name, password } = input;

    const isEmailExists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (isEmailExists) {
      throw new ConflictException('Email already exists');
    }

    const isNameExists = await this.prismaService.user.findUnique({
      where: { name },
    });

    if (isNameExists) {
      throw new ConflictException('Name already exists');
    }

    const user = await this.prismaService.user.create({
      data: {
        email,
        name,
        password: await hash(password),
        role: Role.USER,
      },
    });

    return user;
  }
}
