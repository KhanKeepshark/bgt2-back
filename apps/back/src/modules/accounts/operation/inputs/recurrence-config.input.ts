import { RecurrenceFrequency } from '@prisma/generated';
import { Field, InputType, Int, registerEnumType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

registerEnumType(RecurrenceFrequency, {
  name: 'RecurrenceFrequency',
  description: 'Frequency of recurrence',
});

@InputType()
export class RecurrenceConfigInput {
  @Field(() => RecurrenceFrequency)
  @IsNotEmpty()
  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @Field(() => Int)
  @IsNotEmpty()
  @IsInt()
  @Min(1, { message: 'Interval must be at least 1' })
  @Max(400, { message: 'Interval cannot exceed 400' })
  interval: number;

  @Field(() => [Int], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1, { message: 'At least one weekday must be selected' })
  @ArrayMaxSize(7, { message: 'Cannot select more than 7 weekdays' })
  @Min(0, { each: true, message: 'Weekday must be between 0 and 6' })
  @Max(6, { each: true, message: 'Weekday must be between 0 and 6' })
  weekDays?: number[];
}
