"use client";

interface HeroKPIsProps {
  todayEarnings: number;
  monthEarnings: number;
  activeReferralsCount: number;
}

export function HeroKPIs({
  todayEarnings,
  monthEarnings,
  activeReferralsCount,
}: HeroKPIsProps) {
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Active Referrals */}
      <div className="p-6 bg-onsurface-900 rounded-xl">
        <p className="text-caption text-white-600 mb-3">Active referrals</p>
        <p className="text-display text-white-900" style={{ fontSize: '1.6rem' }}>{activeReferralsCount}</p>
      </div>
    </div>
  );
}

