import {
  AccountError,
  AuthError,
  CategoryError,
  FileError,
  GeneralError,
  NotificationError,
  OperationError,
  RecurrenceError,
  SubscriptionError,
  TagError,
} from './errors.constants';

export const AppErrors = {
  Auth: AuthError,
  Account: AccountError,
  Category: CategoryError,
  File: FileError,
  General: GeneralError,
  Notification: NotificationError,
  Operation: OperationError,
  Recurrence: RecurrenceError,
  Subscription: SubscriptionError,
  Tag: TagError,
} as const;

export type AppErrorType = typeof AppErrors;
