import { Redis } from "@upstash/redis";
import { isTestMode } from "./env";

/**
 * Realtime event types supported by the system
 */
export type RealtimeEventType =
  | "deposit_status_updated"
  | "wallet_balance_updated"
  | "operation_created"
  | "operation_updated"
  | "affiliate_payout_created";

/**
 * Base interface for all realtime events
 */
export interface RealtimeEventBase {
  type: RealtimeEventType;
  userId: string; // who is affected
  timestamp: string; // ISO 8601
}

/**
 * Event emitted when a deposit status changes
 */
export interface DepositStatusUpdatedEvent extends RealtimeEventBase {
  type: "deposit_status_updated";
  depositId: string;
  status: string; // e.g. 'paying' | 'paid' | 'expired' | 'failed' | 'cancelled'
  providerStatus?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;
  txStatus?: string | null;
}

/**
 * Event emitted when wallet balance changes
 */
export interface WalletBalanceUpdatedEvent extends RealtimeEventBase {
  type: "wallet_balance_updated";
  walletId: string;
  balance: string; // decimal as string to avoid precision issues
}

/**
 * Event emitted when a new operation is created
 */
export interface OperationCreatedEvent extends RealtimeEventBase {
  type: "operation_created";
  operationId: string;
  operationType: string;
  status: string;
}

/**
 * Event emitted when an operation is updated
 */
export interface OperationUpdatedEvent extends RealtimeEventBase {
  type: "operation_updated";
  operationId: string;
  operationType: string;
  status: string;
}

/**
 * Event emitted when a referral payout is created
 */
export interface AffiliatePayoutCreatedEvent extends RealtimeEventBase {
  type: "affiliate_payout_created";
  payoutId?: string; // Optional: may not be present for grouped payouts
  amount: string;
  level?: number; // Optional: may not be present for grouped payouts
  fromUserId?: string; // Optional: may not be present for grouped payouts
  periodStart?: string; // ISO string of period start
}

/**
 * Union type of all realtime events
 */
export type RealtimeEvent =
  | DepositStatusUpdatedEvent
  | WalletBalanceUpdatedEvent
  | OperationCreatedEvent
  | OperationUpdatedEvent
  | AffiliatePayoutCreatedEvent;

/**
 * Redis channel name for realtime events
 */
const CHANNEL_NAME = "axon:events";

/**
 * Get Redis client instance
 * Reuses the same pattern as rate-limit-redis.ts
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

/**
 * Emit a realtime event to Upstash Redis.
 * 
 * Since Upstash REST API doesn't support native pub/sub, we use a queue pattern:
 * - Events are stored in a Redis list with TTL
 * - SSE endpoint polls this list
 * 
 * This must only be called AFTER a successful DB transaction commit.
 * Events are fire-and-forget - if Redis is unavailable, the event is lost
 * but the system continues to work (DB is source of truth).
 * 
 * @param event - The realtime event to emit
 * @throws Never throws - errors are logged but not propagated
 */
export async function emitRealtimeEvent(event: RealtimeEvent): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    // In test mode without Redis, log but don't fail
    if (isTestMode()) {
      console.log("[Realtime] Redis not configured, skipping event:", event.type);
    }
    return;
  }

  try {
    // Store event in a Redis list with user-specific key for efficient polling
    const eventKey = `${CHANNEL_NAME}:${event.userId}`;
    
    // Upstash Redis REST API automatically serializes objects to JSON
    // So we can pass the object directly
    await Promise.all([
      redis.lpush(eventKey, event),
      redis.expire(eventKey, 60),
    ]);
    
    if (isTestMode()) {
      console.log("[Realtime] Event emitted:", event.type, "for user:", event.userId);
    }
  } catch (error) {
    // Log error but don't throw - realtime is an optimization, not critical
    console.error("[Realtime] Failed to emit event:", error, "Event:", event);
  }
}

