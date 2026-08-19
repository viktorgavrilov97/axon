/**
 * Affiliate program configuration
 * Defines levels, percentages, and turnover thresholds
 * 
 * Source of truth for all affiliate level configurations
 */

export interface AffiliateLevelConfig {
  level: number;
  percent: number; // Decimal (0.20 = 20%)
  requiredTurnover: number; // in USDT, 0 means always unlocked
}

/**
 * Complete configuration of all 14 affiliate levels
 * Levels 1-3: always unlocked (requiredTurnover: 0)
 * Levels 4-14: unlocked when turnover >= requiredTurnover
 */
export const AFFILIATE_LEVELS: AffiliateLevelConfig[] = [
  // Levels 1-3: always unlocked
  { level: 1, percent: 0.20, requiredTurnover: 0 },
  { level: 2, percent: 0.10, requiredTurnover: 0 },
  { level: 3, percent: 0.05, requiredTurnover: 0 },
  
  // Levels 4-5: unlocked at $10,000 turnover
  { level: 4, percent: 0.15, requiredTurnover: 10_000 },
  { level: 5, percent: 0.03, requiredTurnover: 10_000 },
  
  // Levels 6-8: unlocked at $50,000 turnover
  { level: 6, percent: 0.10, requiredTurnover: 50_000 },
  { level: 7, percent: 0.05, requiredTurnover: 50_000 },
  { level: 8, percent: 0.02, requiredTurnover: 50_000 },
  
  // Levels 9-11: unlocked at $100,000 turnover
  { level: 9, percent: 0.05, requiredTurnover: 100_000 },
  { level: 10, percent: 0.03, requiredTurnover: 100_000 },
  { level: 11, percent: 0.01, requiredTurnover: 100_000 },
  
  // Levels 12-14: unlocked at $250,000 turnover
  { level: 12, percent: 0.10, requiredTurnover: 250_000 },
  { level: 13, percent: 0.05, requiredTurnover: 250_000 },
  { level: 14, percent: 0.03, requiredTurnover: 250_000 },
];

// Legacy interfaces for backward compatibility (deprecated, use AFFILIATE_LEVELS)
export interface LevelConfig {
  level: number;
  percent: number;
}

export interface TurnoverLevelConfig {
  minTurnover: number;
  levels: LevelConfig[];
}

// Legacy exports (deprecated, use AFFILIATE_LEVELS)
export const BASE_LEVELS: LevelConfig[] = AFFILIATE_LEVELS.filter(l => l.requiredTurnover === 0).map(l => ({ level: l.level, percent: l.percent }));

export const TURNOVER_LEVELS: TurnoverLevelConfig[] = [
  {
    minTurnover: 10_000,
    levels: AFFILIATE_LEVELS.filter(l => l.requiredTurnover === 10_000).map(l => ({ level: l.level, percent: l.percent })),
  },
  {
    minTurnover: 50_000,
    levels: AFFILIATE_LEVELS.filter(l => l.requiredTurnover === 50_000).map(l => ({ level: l.level, percent: l.percent })),
  },
  {
    minTurnover: 100_000,
    levels: AFFILIATE_LEVELS.filter(l => l.requiredTurnover === 100_000).map(l => ({ level: l.level, percent: l.percent })),
  },
  {
    minTurnover: 250_000,
    levels: AFFILIATE_LEVELS.filter(l => l.requiredTurnover === 250_000).map(l => ({ level: l.level, percent: l.percent })),
  },
];

/**
 * Get all levels that should be unlocked based on turnover
 * Levels 1-3 are always unlocked (requiredTurnover: 0)
 * Levels 4-14 are unlocked when turnover >= requiredTurnover
 */
export function getUnlockedLevels(turnover: number): number[] {
  return AFFILIATE_LEVELS
    .filter((level) => level.requiredTurnover === 0 || turnover >= level.requiredTurnover)
    .map((level) => level.level)
    .sort((a, b) => a - b);
}

/**
 * Get percentage for a specific level
 */
export function getLevelPercent(level: number): number | null {
  const levelConfig = AFFILIATE_LEVELS.find((l) => l.level === level);
  return levelConfig?.percent ?? null;
}

/**
 * Get required turnover for a specific level
 * Returns 0 for levels 1-3 (always unlocked)
 */
export function getRequiredTurnover(level: number): number | null {
  const levelConfig = AFFILIATE_LEVELS.find((l) => l.level === level);
  return levelConfig?.requiredTurnover ?? null;
}

/**
 * Get level configuration
 */
export function getLevelConfig(level: number): AffiliateLevelConfig | null {
  return AFFILIATE_LEVELS.find((l) => l.level === level) ?? null;
}

/**
 * Get next level threshold
 * Returns the smallest requiredTurnover that is greater than currentTurnover
 */
export function getNextLevelThreshold(currentTurnover: number): number | null {
  const thresholds = AFFILIATE_LEVELS
    .map((l) => l.requiredTurnover)
    .filter((t) => t > 0 && t > currentTurnover)
    .sort((a, b) => a - b);
  
  return thresholds[0] ?? null; // All levels unlocked
}

