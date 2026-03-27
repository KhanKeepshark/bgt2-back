import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class LocalizedStringInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  en?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  ru?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  kz?: string;
}
