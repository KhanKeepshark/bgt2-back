export const PREMIUM_INTEREST_REASONS = [
  'account',
  'operations',
  'ai_tokens',
  'export',
  'auto_category',
  'premium_page',
] as const;

export type PremiumInterestReason = (typeof PREMIUM_INTEREST_REASONS)[number];

export function isPremiumInterestReason(
  reason: string,
): reason is PremiumInterestReason {
  return (PREMIUM_INTEREST_REASONS as readonly string[]).includes(reason);
}
