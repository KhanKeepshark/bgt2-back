import { isDev } from '@back/src/shared/utils/is-dev.util';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import type { ConfigService } from '@nestjs/config';
import { join } from 'path';

export function getGraphqlConfig(
  configService: ConfigService,
): ApolloDriverConfig {
  return {
    playground: isDev(configService),
    path: configService.getOrThrow<string>('GRAPHQL_PREFIX'),
    autoSchemaFile: join(
      process.cwd(),
      'apps/back/src/core/graphql/schema.gql',
    ),
    sortSchema: true,
    context: ({ req, res }) => ({ req, res }),
  };
}
