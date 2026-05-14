import { Catch, ArgumentsHost, HttpException, HttpStatus, Logger, ExceptionFilter } from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const type = host.getType<GqlContextType | 'rpc' | 'rmq'>();

    this.logger.error(
      `Unhandled Exception [Type: ${type}]`,
      exception instanceof Error ? exception.stack : exception,
    );

    if (type === 'rpc' || type === 'rmq') {
      const message = exception instanceof Error ? exception.message : 'Internal RPC Error';
      // Возвращаем Observable с ошибкой для RabbitMQ
      return throwError(() => new RpcException(message).getError());
    }

    if (type === 'graphql') {
      // Пробрасываем дальше, чтобы отработал formatError из graphql.config.ts
      throw exception;
    }

    if (type === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse();
      const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = exception instanceof HttpException ? exception.getResponse() : { message: 'Internal server error', statusCode: status };

      if (response && typeof response.status === 'function') {
        response.status(status).json(message);
      }
    }
  }
}
