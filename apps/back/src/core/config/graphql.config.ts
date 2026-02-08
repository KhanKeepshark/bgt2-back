import { isDev } from '@back/shared/utils/is-dev.util';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import type { ConfigService } from '@nestjs/config';
import type { GraphQLFormattedError } from 'graphql';
import { join } from 'path';

export function getGraphqlConfig(
  configService: ConfigService,
): ApolloDriverConfig {
  const devMode = isDev(configService);

  return {
    playground: devMode,
    path: configService.getOrThrow<string>('GRAPHQL_PREFIX'),
    autoSchemaFile: join(
      process.cwd(),
      'apps/back/src/core/graphql/schema.gql',
    ),
    sortSchema: true,
    context: ({ req, res }) => ({ req, res }),
    formatError: (error: GraphQLFormattedError) => {
      // В production окружении скрываем stacktrace и детали внутренних ошибок
      if (!devMode) {
        const { extensions, ...rest } = error;
        
        // Удаляем stacktrace из extensions
        if (extensions) {
          const { stacktrace, exception, ...safeExtensions } = extensions;
          
          return {
            ...rest,
            extensions: {
              ...safeExtensions,
              // Оставляем только код ошибки, без деталей
              code: extensions.code || 'INTERNAL_SERVER_ERROR',
            },
          };
        }
        
        return {
          ...rest,
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        };
      }
      
      // В development окружении возвращаем полную информацию об ошибке
      return error;
    },
  };
}
