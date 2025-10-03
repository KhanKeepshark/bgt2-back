import { PrismaService } from '@back/src/core/prisma/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserInput } from './inputs/create-user.input';
import { hash } from 'argon2';
import { VerificationService } from '../verification/verification.service';
import { AccountService } from '../../accounts/account/account.service';
import { CategoryService } from '../../accounts/category/category.service';
@Injectable()
export class UserService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly accountService: AccountService,
    private readonly categoryService: CategoryService,
    private readonly verificationService: VerificationService,
  ) {}

  public async findAll() {
    const users = await this.prismaService.user.findMany();

    return users;
  }

  public async me(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      include: {
        accounts: true,
        tags: true,
        categories: {
          include: {
            children: true,
          },
        },
      },
    });

    return user;
  }

  public async create(input: CreateUserInput) {
    const { email, password } = input;

    const isEmailExists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (isEmailExists) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.prismaService.user.create({
      data: {
        email,
        password: await hash(password),
        role: 'USER',
        lastLoginAt: new Date(),
      },
    });

    await this.accountService.createDefault(user);
    await this.categoryService.createDefault(user);

    // await this.verificationService.sendVerificationEmail(user);

    return true;
  }
}
