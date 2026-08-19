"use server";

import { headers } from "next/headers";

// Simple in-memory rate limiter
// For production, consider using Redis or Upstash
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    Object.keys(store).forEach((key) => {
      if (store[key].resetAt < now) {
        delete store[key];
      }
    });
  };
  
  // Run cleanup every 5 minutes
  if (typeof setInterval !== "undefined") {
    setInterval(cleanup, 5 * 60 * 1000);
  }
}

interface RateLimitOptions {
  limit: number; // Maximum number of requests
  window: number; // Time window in seconds
  identifier?: string; // Custom identifier (defaults to IP address)
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
}

/**
 * Simple rate limiter for serverless environments
 * Uses in-memory store (for production, use Redis/Upstash)
 */
export async function rateLimit(
  options: RateLimitOptions
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

  const now = Date.now();
  const windowMs = window * 1000;
  const record = store[key];

  // If no record or window expired, create new record
  if (!record || record.resetAt < now) {
    store[key] = {
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
export async function rateLimitPasswordReset(identifier?: string): Promise<RateLimitResult> {
  return rateLimit({
    limit: 3, // 3 attempts
    window: 3600, // per hour
    identifier,
  });
}




