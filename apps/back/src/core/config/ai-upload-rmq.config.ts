import type { ConfigService } from '@nestjs/config';
import type { RmqOptions } from '@nestjs/microservices';

export const AI_UPLOAD_QUEUE_DEFAULT = 'ai_upload_queue';

export function resolveAiUploadQueueName(raw?: string | null): string {
  const name = raw?.trim();
  return name || AI_UPLOAD_QUEUE_DEFAULT;
}

export function getAiUploadQueueName(config: ConfigService): string {
  return resolveAiUploadQueueName(config.get<string>('AI_UPLOAD_QUEUE'));
}

export function getAiUploadRmqOptions(
  config: ConfigService,
  extra?: Pick<NonNullable<RmqOptions['options']>, 'noAck'>,
): RmqOptions['options'] {
  const rabbitUser = config.getOrThrow<string>('RABBITMQ_USER');
  const rabbitPassword = config.getOrThrow<string>('RABBITMQ_PASSWORD');
  const rabbitName = config.getOrThrow<string>('RABBITMQ_NAME');

  return {
    urls: [`amqp://${rabbitUser}:${rabbitPassword}@${rabbitName}:5672`],
    queue: getAiUploadQueueName(config),
    queueOptions: { durable: true },
    ...extra,
  };
}
