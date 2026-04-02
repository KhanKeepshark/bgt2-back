import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FileDownloadModel {
  @Field(() => String)
  filename: string;

  @Field(() => String)
  base64: string;

  @Field(() => String)
  mimeType: string;
}
