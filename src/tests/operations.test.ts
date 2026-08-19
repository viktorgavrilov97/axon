import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOperations, getOperationById } from "@/modules/operations/lib/operations-service";
import { createMockUser, createMockWallet, createMockDeposit } from "./test-utils";
import { Prisma, DepositStatus, WithdrawalStatus } from "@prisma/client";

// Mock database
vi.mock("@/shared/lib/db", () => {
  const mockDb = {
    wallet: {
      findUnique: vi.fn(),
    },
    deposit: {
      findFirst: vi.fn(),
    },
    withdrawal: {
      findFirst: vi.fn(),
    },
  };
  return { db: mockDb };
});

import { db } from "@/shared/lib/db";

describe("getOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should combine deposits and withdrawals into single operations list", async () => {
    const mockWallet = createMockWallet({ id: "wallet-1" });

    const mockDeposit = createMockDeposit({
      id: "deposit-1",
      walletId: "wallet-1",
      amountUsdt: new Prisma.Decimal(100),
      status: DepositStatus.CONFIRMED,
      createdAt: new Date("2025-01-20T10:00:00Z"),
    });

    const mockWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(50),
      status: WithdrawalStatus.PENDING,
      createdAt: new Date("2025-01-21T10:00:00Z"),
      processedAt: null,
      toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      rejectionReason: null,
    };

    vi.mocked(db.wallet.findUnique).mockResolvedValue({
      ...mockWallet,
      deposits: [mockDeposit],
      withdrawals: [mockWithdrawal],
    } as any);

    const operations = await getOperations("user-1");

    expect(operations).toHaveLength(2);
    expect(operations[0].type).toBe("withdrawal"); // Newer first
    expect(operations[0].id).toBe("withdrawal-1");
    expect(operations[1].type).toBe("deposit");
    expect(operations[1].id).toBe("deposit-1");
  });

  it("should sort operations by createdAt desc (newest first)", async () => {
    const mockWallet = createMockWallet({ id: "wallet-1" });

    const oldDeposit = createMockDeposit({
      id: "deposit-old",
      walletId: "wallet-1",
      amountUsdt: new Prisma.Decimal(50),
      createdAt: new Date("2025-01-19T10:00:00Z"),
    });

    const newDeposit = createMockDeposit({
      id: "deposit-new",
      walletId: "wallet-1",
      amountUsdt: new Prisma.Decimal(100),
      createdAt: new Date("2025-01-21T10:00:00Z"),
    });

    vi.mocked(db.wallet.findUnique).mockResolvedValue({
      ...mockWallet,
      deposits: [oldDeposit, newDeposit],
      withdrawals: [],
    } as any);

    const operations = await getOperations("user-1");

    expect(operations).toHaveLength(2);
    expect(operations[0].id).toBe("deposit-new"); // Newer first
    expect(operations[1].id).toBe("deposit-old");
  });

  it("should return empty array when wallet doesn't exist", async () => {
    vi.mocked(db.wallet.findUnique).mockResolvedValue(null);

    const operations = await getOperations("user-1");

    expect(operations).toEqual([]);
  });

  it("should correctly map deposit fields to Operation DTO", async () => {
    const mockWallet = createMockWallet({ id: "wallet-1" });

    const mockDeposit = createMockDeposit({
      id: "deposit-1",
      walletId: "wallet-1",
      amountUsdt: new Prisma.Decimal(100),
      amountCrypto: new Prisma.Decimal(99.5),
      status: DepositStatus.CONFIRMED,
      payCurrency: "usdtmatic",
      payAddress: "0xTestAddress",
      txHash: "0xTxHash123",
      createdAt: new Date("2025-01-20T10:00:00Z"),
      confirmedAt: new Date("2025-01-20T10:05:00Z"),
      expiresAt: new Date("2025-01-20T11:00:00Z"),
    });

    vi.mocked(db.wallet.findUnique).mockResolvedValue({
      ...mockWallet,
      deposits: [mockDeposit],
      withdrawals: [],
    } as any);

    const operations = await getOperations("user-1");

    expect(operations).toHaveLength(1);
    const operation = operations[0];
    expect(operation.type).toBe("deposit");
    expect(operation.amount).toBe(100);
    expect(operation.status).toBe(DepositStatus.CONFIRMED);
    expect(operation.amountUsdt).toBe(100);
    expect(operation.amountCrypto).toBe(99.5);
    expect(operation.payCurrency).toBe("usdtmatic");
    expect(operation.address).toBe("0xTestAddress");
    expect(operation.txHash).toBe("0xTxHash123");
    expect(operation.confirmedAt).toEqual(new Date("2025-01-20T10:05:00Z"));
    expect(operation.expiresAt).toEqual(new Date("2025-01-20T11:00:00Z"));
  });

  it("should correctly map withdrawal fields to Operation DTO", async () => {
    const mockWallet = createMockWallet({ id: "wallet-1" });

    const mockWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(50),
      status: WithdrawalStatus.REJECTED,
      createdAt: new Date("2025-01-21T10:00:00Z"),
      processedAt: new Date("2025-01-21T11:00:00Z"),
      toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      rejectionReason: "Invalid address",
    };

    vi.mocked(db.wallet.findUnique).mockResolvedValue({
      ...mockWallet,
      deposits: [],
      withdrawals: [mockWithdrawal],
    } as any);

    const operations = await getOperations("user-1");

    expect(operations).toHaveLength(1);
    const operation = operations[0];
    expect(operation.type).toBe("withdrawal");
    expect(operation.amount).toBe(50);
    expect(operation.status).toBe(WithdrawalStatus.REJECTED);
    expect(operation.toAddress).toBe("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb");
    expect(operation.rejectionReason).toBe("Invalid address");
    expect(operation.processedAt).toEqual(new Date("2025-01-21T11:00:00Z"));
    expect(operation.expiresAt).toBeUndefined();
  });
});

describe("getOperationById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return deposit operation by ID", async () => {
    const mockWallet = createMockWallet({ id: "wallet-1" });

    const mockDeposit = createMockDeposit({
      id: "deposit-1",
      walletId: "wallet-1",
      amountUsdt: new Prisma.Decimal(100),
      status: DepositStatus.CONFIRMED,
    });

    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(db.deposit.findFirst).mockResolvedValue(mockDeposit);

    const operation = await getOperationById("deposit-1", "user-1");

    expect(operation).not.toBeNull();
    expect(operation?.type).toBe("deposit");
    expect(operation?.id).toBe("deposit-1");
  });

  it("should return withdrawal operation by ID", async () => {
    const mockWallet = createMockWallet({ id: "wallet-1" });

    const mockWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(50),
      status: WithdrawalStatus.PENDING,
      createdAt: new Date(),
      processedAt: null,
      toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      rejectionReason: null,
    };

    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(db.deposit.findFirst).mockResolvedValue(null);
    vi.mocked(db.withdrawal.findFirst).mockResolvedValue(mockWithdrawal);

    const operation = await getOperationById("withdrawal-1", "user-1");

    expect(operation).not.toBeNull();
    expect(operation?.type).toBe("withdrawal");
    expect(operation?.id).toBe("withdrawal-1");
  });

  it("should return null for non-existent operation", async () => {
    const mockWallet = createMockWallet({ id: "wallet-1" });

    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(db.deposit.findFirst).mockResolvedValue(null);
    vi.mocked(db.withdrawal.findFirst).mockResolvedValue(null);

    const operation = await getOperationById("non-existent", "user-1");

    expect(operation).toBeNull();
  });

  it("should return null when wallet doesn't exist", async () => {
    vi.mocked(db.wallet.findUnique).mockResolvedValue(null);

    const operation = await getOperationById("deposit-1", "user-1");

    expect(operation).toBeNull();
  });
});

