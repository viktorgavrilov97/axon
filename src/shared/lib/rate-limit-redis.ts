import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// In-memory fallback for development
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const inMemoryStore: RateLimitStore = {};

// Clean up old entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    Object.keys(inMemoryStore).forEach((key) => {
      if (inMemoryStore[key].resetAt < now) {
        delete inMemoryStore[key];
      }
    });
  };
  
  if (typeof setInterval !== "undefined") {
    setInterval(cleanup, 5 * 60 * 1000);
  }
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
}

/**
 * Initialize Upstash Redis client
 * Returns null if credentials are not available (dev mode)
 */
function getRedisClient(): Redis | null {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  try {
    return new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (error) {
    console.error("[RateLimit] Failed to initialize Redis client:", error);
    return null;
  }
}

/**
 * In-memory rate limiter (fallback for dev)
 */
async function rateLimitInMemory(
  key: string,
  limit: number,
  window: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = window * 1000;
  const record = inMemoryStore[key];

  // If no record or window expired, create new record
  if (!record || record.resetAt < now) {
    inMemoryStore[key] = {
      count: 1,
      resetAt: now + windowMs,
    };
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor((now + windowMs) / 1000),
    };
  }

  // Increment count
  record.count++;

  // Check if limit exceeded
  if (record.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.floor(record.resetAt / 1000),
    };
  }

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.floor(record.resetAt / 1000),
  };
}

/**
 * Rate limiter with Upstash Redis (production) or in-memory fallback (dev)
 */
export async function rateLimit(
  options: {
    limit: number;
    window: number; // in seconds
    identifier?: string;
  }
): Promise<RateLimitResult> {
  const { limit, window, identifier } = options;

  // Get identifier (IP address by default)
  let key: string;
  if (identifier) {
    key = identifier;
  } else {
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      "unknown";
    key = ip;
  }

  const redis = getRedisClient();

  // Use Upstash Redis if available (production)
  if (redis) {
    try {
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${window} s`),
        analytics: true,
      });

      const result = await ratelimit.limit(key);

      return {
        success: result.success,
        limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      console.error("[RateLimit] Redis error, falling back to in-memory:", error);
      // Fall through to in-memory fallback
    }
  }

  // Fallback to in-memory (dev mode or Redis unavailable)
  return rateLimitInMemory(key, limit, window);
}

/**
 * Rate limit for authentication endpoints
 */
export async function rateLimitAuth(identifier?: string): Promise<RateLimitResult> {
  return rateLimit({
    limit: 5, // 5 attempts
    window: 60, // per minute
    identifier,
  });
}

/**
 * Rate limit for OTP endpoints
 */
export async function rateLimitOTP(identifier?: string): Promise<RateLimitResult> {
  return rateLimit({
    limit: 3, // 3 attempts
    window: 300, // per 5 minutes
    identifier,
  });
}

/**
 * Rate limit for password reset
 */
export async function rateLimitPasswordReset(
  identifier?: string
): Promise<RateLimitResult> {
  return rateLimit({
    limit: 3, // 3 attempts
    window: 3600, // per hour
    identifier,
  });
}

