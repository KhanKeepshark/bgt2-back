import { resolveAiUploadQueueName } from './ai-upload-rmq.config';

describe('resolveAiUploadQueueName', () => {
  it('defaults when unset', () => {
    expect(resolveAiUploadQueueName()).toBe('ai_upload_queue');
  });

  it('uses env value when set', () => {
    expect(resolveAiUploadQueueName('ai_upload_queue_staging')).toBe(
      'ai_upload_queue_staging',
    );
  });
});
