import { Field, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { NotificationScope } from '@prisma/generated';

@InputType()
export class CreateNotificationInput {
  @Field(() => NotificationScope, {
    nullable: true,
    defaultValue: NotificationScope.USER,
    description: 'USER = personal, GLOBAL = for all users',
  })
  @IsOptional()
  @IsEnum(NotificationScope)
  scope?: NotificationScope;

  @Field(() => String, {
    nullable: true,
    description: 'Required when scope=USER, target user id',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  description: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  link?: string;

  @Field(() => String)
  @IsString()
  @IsOptional()
  @MinLength(1)
  buttonText: string;
}
