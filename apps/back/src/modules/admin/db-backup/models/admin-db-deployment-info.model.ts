import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminDbDeploymentInfoModel {
  @Field()
  environment: string;

  @Field()
  targetDatabase: string;

  @Field()
  restoreEnabled: boolean;

  @Field()
  totpRequiredForRestore: boolean;
}
