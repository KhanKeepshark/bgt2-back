import {
  FREE_PLAN_LIMITS,
  PREMIUM_PLAN_LIMITS,
} from './subscription-plan-limits';

describe('subscription plan seed limits', () => {
  it('FREE plan matches CONTEXT.md', () => {
    expect(FREE_PLAN_LIMITS).toEqual({
      maxAccounts: 1,
      maxCategories: 15,
      maxOperationsPerMonth: 50,
      tokensOnPurchase: 25000,
      tokensPerMonth: null,
      canExportData: false,
      canUseAutoCategory: false,
    });
  });

  it('PREMIUM plan matches CONTEXT.md', () => {
    expect(PREMIUM_PLAN_LIMITS).toEqual({
      maxAccounts: null,
      maxCategories: null,
      maxOperationsPerMonth: null,
      tokensPerMonth: 250000,
      tokensOnPurchase: 25000,
      canExportData: true,
      canUseAutoCategory: true,
    });
  });
});
