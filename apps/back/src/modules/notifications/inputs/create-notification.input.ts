import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationScope } from '@prisma/generated';
import { LocalizedStringInput } from './localized-string.input';

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

  @Field(() => LocalizedStringInput)
  @ValidateNested()
  @Type(() => LocalizedStringInput)
  title: LocalizedStringInput;

  @Field(() => LocalizedStringInput)
  @ValidateNested()
  @Type(() => LocalizedStringInput)
  description: LocalizedStringInput;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  link?: string;

  @Field(() => LocalizedStringInput)
  @ValidateNested()
  @Type(() => LocalizedStringInput)
  buttonText: LocalizedStringInput;
}
