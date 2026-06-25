import {
  FREE_PLAN_LIMITS,
  PREMIUM_PLAN_LIMITS,
} from './subscription-plan-limits';

describe('subscription plan seed limits', () => {
  it('FREE plan matches seed constants', () => {
    expect(FREE_PLAN_LIMITS).toEqual({
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
    });
  });

  it('PREMIUM plan matches CONTEXT.md', () => {
    expect(PREMIUM_PLAN_LIMITS).toEqual({
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
    });
  });
});
