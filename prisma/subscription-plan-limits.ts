/** CONTEXT.md FREE plan limits — used by ensure-admin seed. */
export const FREE_PLAN_LIMITS = {
  maxAccounts: 1,
  maxCategories: 15,
  maxOperationsPerMonth: 50,
  maxTags: 10,
  maxRecurrenceConfigs: 3,
  maxCategoryKeywordsPerCategory: 5,
  tokensOnPurchase: 25000,
  tokensPerMonth: null,
  canExportData: false,
  canUseAutoCategory: false,
} as const;

/** CONTEXT.md PREMIUM plan limits — used by ensure-admin seed. */
export const PREMIUM_PLAN_LIMITS = {
  maxAccounts: 10,
  maxCategories: 50,
  maxOperationsPerMonth: 500,
  maxTags: 30,
  maxRecurrenceConfigs: 20,
  maxCategoryKeywordsPerCategory: 20,
  tokensPerMonth: 250000,
  tokensOnPurchase: 25000,
  canExportData: true,
  canUseAutoCategory: true,
} as const;
