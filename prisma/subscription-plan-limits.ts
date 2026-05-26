/** CONTEXT.md FREE plan limits — used by ensure-admin seed. */
export const FREE_PLAN_LIMITS = {
  maxAccounts: 1,
  maxCategories: 15,
  maxOperationsPerMonth: 50,
  tokensOnPurchase: 25000,
  tokensPerMonth: null,
  canExportData: false,
  canUseAutoCategory: false,
} as const;

/** CONTEXT.md PREMIUM plan limits — used by ensure-admin seed. */
export const PREMIUM_PLAN_LIMITS = {
  maxAccounts: null,
  maxCategories: null,
  maxOperationsPerMonth: null,
  tokensPerMonth: 250000,
  tokensOnPurchase: 25000,
  canExportData: true,
  canUseAutoCategory: true,
} as const;
