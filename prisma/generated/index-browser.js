
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.5.0
 * Query Engine version: 173f8d54f8d52e692c7e27e72a88314ec7aeff60
 */
Prisma.prismaVersion = {
  client: "6.5.0",
  engine: "173f8d54f8d52e692c7e27e72a88314ec7aeff60"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  name: 'name',
  defaultAccountId: 'defaultAccountId',
  isActive: 'isActive',
  isEmailVerified: 'isEmailVerified',
  subscriptionPlanId: 'subscriptionPlanId',
  subscriptionPriceId: 'subscriptionPriceId',
  subscriptionStartedAt: 'subscriptionStartedAt',
  subscriptionExpiresAt: 'subscriptionExpiresAt',
  subscriptionAutoRenew: 'subscriptionAutoRenew',
  isTotpEnabled: 'isTotpEnabled',
  totpSecret: 'totpSecret',
  lastLoginAt: 'lastLoginAt',
  loginCount: 'loginCount',
  tokensBalance: 'tokensBalance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  role: 'role',
  lastGlobalNotificationReadAt: 'lastGlobalNotificationReadAt',
  welcomeSheetSeenAt: 'welcomeSheetSeenAt',
  operationsArchivalNotifiedAt: 'operationsArchivalNotifiedAt'
};

exports.Prisma.SubscriptionPlanScalarFieldEnum = {
  id: 'id',
  type: 'type',
  description: 'description',
  tokensPerMonth: 'tokensPerMonth',
  tokensOnPurchase: 'tokensOnPurchase',
  maxCategories: 'maxCategories',
  maxAccounts: 'maxAccounts',
  maxTags: 'maxTags',
  maxRecurrenceConfigs: 'maxRecurrenceConfigs',
  maxOperationsPerMonth: 'maxOperationsPerMonth',
  maxCategoryKeywordsPerCategory: 'maxCategoryKeywordsPerCategory',
  canExportData: 'canExportData',
  canUseAutoCategory: 'canUseAutoCategory',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionPriceScalarFieldEnum = {
  id: 'id',
  planId: 'planId',
  name: 'name',
  price: 'price',
  currency: 'currency',
  durationDays: 'durationDays',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  type: 'type',
  expiresAt: 'expiresAt',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  name: 'name',
  initialBalance: 'initialBalance',
  balance: 'balance',
  currency: 'currency',
  icon: 'icon',
  iconColor: 'iconColor',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OperationScalarFieldEnum = {
  id: 'id',
  amount: 'amount',
  date: 'date',
  description: 'description',
  type: 'type',
  userId: 'userId',
  accountId: 'accountId',
  transferAccountId: 'transferAccountId',
  categoryId: 'categoryId',
  recurrenceConfigId: 'recurrenceConfigId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OperationMonthlyRollupScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  yearMonth: 'yearMonth',
  type: 'type',
  categoryId: 'categoryId',
  accountId: 'accountId',
  totalAmount: 'totalAmount',
  operationCount: 'operationCount',
  categoryName: 'categoryName',
  categoryIcon: 'categoryIcon',
  accountName: 'accountName',
  createdAt: 'createdAt'
};

exports.Prisma.RecurrenceConfigScalarFieldEnum = {
  id: 'id',
  frequency: 'frequency',
  interval: 'interval',
  weekDays: 'weekDays',
  date: 'date',
  amount: 'amount',
  description: 'description',
  type: 'type',
  userId: 'userId',
  accountId: 'accountId',
  transferAccountId: 'transferAccountId',
  categoryId: 'categoryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  name: 'name',
  color: 'color',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  color: 'color',
  icon: 'icon',
  userId: 'userId',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryKeywordScalarFieldEnum = {
  id: 'id',
  phrase: 'phrase',
  categoryId: 'categoryId',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KeywordFilterScalarFieldEnum = {
  id: 'id',
  phrase: 'phrase',
  type: 'type',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AiUploadTaskScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  result: 'result',
  error: 'error',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AiTokenUsageScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  estimatedTokens: 'estimatedTokens',
  actualTokens: 'actualTokens',
  operationsCreated: 'operationsCreated',
  fileType: 'fileType',
  status: 'status',
  error: 'error',
  createdAt: 'createdAt'
};

exports.Prisma.UserActivityEventScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  status: 'status',
  error: 'error',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  link: 'link',
  buttonText: 'buttonText',
  scope: 'scope',
  userId: 'userId',
  isRead: 'isRead',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemMetricScalarFieldEnum = {
  id: 'id',
  date: 'date',
  totalUsers: 'totalUsers',
  activeUsersDaily: 'activeUsersDaily',
  usersByPlan: 'usersByPlan',
  totalOperations: 'totalOperations',
  operationsCreatedDaily: 'operationsCreatedDaily',
  totalCategories: 'totalCategories',
  totalAccounts: 'totalAccounts',
  aiTokensUsedDaily: 'aiTokensUsedDaily',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  provider: 'provider',
  externalId: 'externalId',
  userId: 'userId',
  subscriptionPriceId: 'subscriptionPriceId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupportTicketScalarFieldEnum = {
  id: 'id',
  email: 'email',
  message: 'message',
  replyMessage: 'replyMessage',
  status: 'status',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserConsentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  version: 'version',
  acceptedAt: 'acceptedAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Role = exports.$Enums.Role = {
  USER: 'USER',
  ADMIN: 'ADMIN'
};

exports.SubscriptionType = exports.$Enums.SubscriptionType = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM'
};

exports.TokenType = exports.$Enums.TokenType = {
  EMAIL_VERIFY: 'EMAIL_VERIFY',
  PASSWORD_RESET: 'PASSWORD_RESET'
};

exports.OperationType = exports.$Enums.OperationType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER'
};

exports.RecurrenceFrequency = exports.$Enums.RecurrenceFrequency = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY'
};

exports.CategoryType = exports.$Enums.CategoryType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE'
};

exports.KeywordFilterType = exports.$Enums.KeywordFilterType = {
  DELETE: 'DELETE'
};

exports.AiUploadTaskStatus = exports.$Enums.AiUploadTaskStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

exports.AiUsageStatus = exports.$Enums.AiUsageStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
};

exports.UserActivityEventType = exports.$Enums.UserActivityEventType = {
  EXPORT: 'EXPORT'
};

exports.UserActivityEventStatus = exports.$Enums.UserActivityEventStatus = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
};

exports.NotificationScope = exports.$Enums.NotificationScope = {
  GLOBAL: 'GLOBAL',
  USER: 'USER'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

exports.SupportTicketStatus = exports.$Enums.SupportTicketStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED'
};

exports.ConsentType = exports.$Enums.ConsentType = {
  TERMS: 'TERMS',
  PRIVACY: 'PRIVACY',
  CROSS_BORDER_PD: 'CROSS_BORDER_PD',
  AI_IMPORT: 'AI_IMPORT'
};

exports.Prisma.ModelName = {
  User: 'User',
  SubscriptionPlan: 'SubscriptionPlan',
  SubscriptionPrice: 'SubscriptionPrice',
  Token: 'Token',
  Account: 'Account',
  Operation: 'Operation',
  OperationMonthlyRollup: 'OperationMonthlyRollup',
  RecurrenceConfig: 'RecurrenceConfig',
  Tag: 'Tag',
  Category: 'Category',
  CategoryKeyword: 'CategoryKeyword',
  KeywordFilter: 'KeywordFilter',
  AiUploadTask: 'AiUploadTask',
  AiTokenUsage: 'AiTokenUsage',
  UserActivityEvent: 'UserActivityEvent',
  Notification: 'Notification',
  SystemMetric: 'SystemMetric',
  Payment: 'Payment',
  SupportTicket: 'SupportTicket',
  UserConsent: 'UserConsent'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
