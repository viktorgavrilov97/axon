/**
 * Build a referral link from a referral code
 */
export function buildReferralLink(referralCode: string): string {
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${baseUrl}/register?ref=${encodeURIComponent(referralCode)}`;
}

