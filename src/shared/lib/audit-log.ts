"use server";

import { db } from "./db";
import { getCurrentUser } from "./auth";

export type AuditAction =
  | "DEPOSIT_CREATED"
  | "DEPOSIT_PAID"
  | "DEPOSIT_CANCELLED"
  | "WITHDRAWAL_CREATED"
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_REJECTED"
  | "WITHDRAWAL_COMPLETED"
  | "BALANCE_ADJUSTED"
  | "STRATEGY_CREATED"
  | "STRATEGY_PROFIT_CREDITED"
  | "STRATEGY_BONUS_CREDITED"
  | "STRATEGY_PRINCIPAL_RETURNED"
  | "TRANSACTION_CREATED"
  | "USER_BALANCE_MANUAL_UPDATE"
  | "TEST_DEPOSIT_CREATED"
  | "TEST_DEPOSITS_PURGED";

export type AuditEntityType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "WALLET"
  | "TRANSACTION"
  | "STRATEGY"
  | "STRATEGY_PROFIT"
  | "USER";

interface CreateAuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, any>;
  userId?: string | null; // Override current user (for system actions)
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 * This should be called for all financial operations and important actions
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    // Get current user if not provided
    let userId = params.userId;
    if (userId === undefined) {
      const user = await getCurrentUser();
      userId = user?.id || null;
    }

    await db.auditLog.create({
      data: {
        userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit: number = 50
) {
  return db.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit: number = 100) {
  return db.auditLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}




