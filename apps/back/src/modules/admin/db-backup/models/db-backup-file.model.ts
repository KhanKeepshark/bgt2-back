import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DbBackupFileModel {
  @Field()
  filename: string;

  @Field(() => Int)
  sizeBytes: number;

  @Field()
  createdAt: Date;

  @Field()
  source: string;

  @Field()
  format: string;
}
