import {
  isPremiumInterestReason,
  PREMIUM_INTEREST_REASONS,
} from './premium-interest.constants';

describe('premium interest constants', () => {
  it('includes all limit gate reasons and premium_page', () => {
    expect(PREMIUM_INTEREST_REASONS).toEqual([
      'account',
      'operations',
      'ai_tokens',
      'export',
      'auto_category',
      'premium_page',
    ]);
  });

  it('validates known reasons', () => {
    expect(isPremiumInterestReason('export')).toBe(true);
    expect(isPremiumInterestReason('premium_page')).toBe(true);
    expect(isPremiumInterestReason('invalid')).toBe(false);
  });
});
