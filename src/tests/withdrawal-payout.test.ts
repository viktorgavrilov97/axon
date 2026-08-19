import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  triggerWithdrawalPayout,
  syncWithdrawalPayoutStatus,
} from "@/modules/wallet/lib/withdrawal-payout-service";
import { createMockUser, createMockWallet } from "./test-utils";
import { Prisma } from "@prisma/client";
import { WithdrawalStatus, WithdrawalProvider, WithdrawalProviderStatus } from "@prisma/client";

// Mock database
vi.mock("@/shared/lib/db", () => {
  const mockDb = {
    withdrawal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      withdrawal: {
        update: vi.fn(),
      },
      wallet: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      transaction: {
        create: vi.fn(),
      },
    })),
  };
  return { db: mockDb };
});

// Mock NOWPayments payout client
vi.mock("@/modules/wallet/lib/nowpayments-payout", () => ({
  createNowpaymentsPayout: vi.fn(),
  getNowpaymentsPayoutStatus: vi.fn(),
}));

// Mock config
vi.mock("@/modules/wallet/lib/nowpayments-config", () => ({
  getNowpaymentsPayoutConfig: vi.fn(() => ({
    apiKey: "test-api-key",
    baseUrl: "https://api.nowpayments.io/v1",
    enabled: true,
  })),
  isNowpaymentsPayoutEnabled: vi.fn(() => true),
}));

import { db } from "@/shared/lib/db";
import {
  createNowpaymentsPayout,
  getNowpaymentsPayoutStatus,
} from "@/modules/wallet/lib/nowpayments-payout";

describe("triggerWithdrawalPayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create payout for APPROVED withdrawal with NOWPAYMENTS provider", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(200),
    });

    const approvedWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      currency: "USDT_POLYGON",
      toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bE0",
      status: WithdrawalStatus.APPROVED,
      provider: WithdrawalProvider.NOWPAYMENTS,
      providerPayoutId: null,
      providerStatus: null,
      providerErrorMessage: null,
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...approvedWithdrawal,
      wallet: mockWallet,
    } as any);

    vi.mocked(createNowpaymentsPayout).mockResolvedValue({
      payoutId: "payout-123",
      status: "pending",
    });

    vi.mocked(db.withdrawal.update).mockResolvedValue({
      ...approvedWithdrawal,
      providerPayoutId: "payout-123",
      providerStatus: WithdrawalProviderStatus.PENDING,
      status: WithdrawalStatus.PROCESSING,
    } as any);

    const result = await triggerWithdrawalPayout("withdrawal-1", "admin-1");

    expect(result.success).toBe(true);
    expect(result.payoutId).toBe("payout-123");
    expect(createNowpaymentsPayout).toHaveBeenCalledWith({
      asset: "USDTMATIC",
      amount: "100",
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bE0",
    });
    expect(db.withdrawal.update).toHaveBeenCalledWith({
      where: { id: "withdrawal-1" },
      data: {
        providerPayoutId: "payout-123",
        providerStatus: WithdrawalProviderStatus.PENDING,
        status: WithdrawalStatus.PROCESSING,
      },
    });
  });

  it("should be idempotent - not create payout if providerPayoutId already exists", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(200),
    });

    const withdrawalWithPayout = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      status: WithdrawalStatus.APPROVED,
      provider: WithdrawalProvider.NOWPAYMENTS,
      providerPayoutId: "payout-123", // Already has payout ID
      providerStatus: WithdrawalProviderStatus.PENDING,
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...withdrawalWithPayout,
      wallet: mockWallet,
    } as any);

    const result = await triggerWithdrawalPayout("withdrawal-1", "admin-1");

    expect(result.success).toBe(true);
    expect(result.payoutId).toBe("payout-123");
    expect(createNowpaymentsPayout).not.toHaveBeenCalled();
    expect(db.withdrawal.update).not.toHaveBeenCalled();
  });

  it("should reject payout for INTERNAL provider", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(200),
    });

    const internalWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      status: WithdrawalStatus.APPROVED,
      provider: WithdrawalProvider.INTERNAL, // Manual processing
      providerPayoutId: null,
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...internalWithdrawal,
      wallet: mockWallet,
    } as any);

    const result = await triggerWithdrawalPayout("withdrawal-1", "admin-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("INTERNAL");
    expect(createNowpaymentsPayout).not.toHaveBeenCalled();
  });

  it("should reject payout if withdrawal status is not APPROVED", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(200),
    });

    const pendingWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      status: WithdrawalStatus.PENDING, // Not approved
      provider: WithdrawalProvider.NOWPAYMENTS,
      providerPayoutId: null,
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...pendingWithdrawal,
      wallet: mockWallet,
    } as any);

    await expect(
      triggerWithdrawalPayout("withdrawal-1", "admin-1")
    ).rejects.toThrow("expected APPROVED");
  });

  it("should reject payout if balance is insufficient", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(50), // Less than withdrawal amount
    });

    const approvedWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      status: WithdrawalStatus.APPROVED,
      provider: WithdrawalProvider.NOWPAYMENTS,
      providerPayoutId: null,
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...approvedWithdrawal,
      wallet: mockWallet,
    } as any);

    await expect(
      triggerWithdrawalPayout("withdrawal-1", "admin-1")
    ).rejects.toThrow("Insufficient balance");
  });
});

describe("syncWithdrawalPayoutStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should sync status and deduct balance when payout is finished", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(200),
    });

    const processingWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      currency: "USDT_POLYGON",
      status: WithdrawalStatus.PROCESSING,
      provider: WithdrawalProvider.NOWPAYMENTS,
      providerPayoutId: "payout-123",
      providerStatus: WithdrawalProviderStatus.PROCESSING,
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...processingWithdrawal,
      wallet: mockWallet,
    } as any);

    vi.mocked(getNowpaymentsPayoutStatus).mockResolvedValue({
      payoutId: "payout-123",
      status: "finished",
      txHash: "0xTxHash123",
    });

    const tx = {
      withdrawal: {
        update: vi.fn().mockResolvedValue({
          ...processingWithdrawal,
          status: WithdrawalStatus.COMPLETED,
          providerStatus: WithdrawalProviderStatus.COMPLETED,
          txHash: "0xTxHash123",
          processedAt: new Date(),
        }),
      },
      wallet: {
        findUnique: vi.fn().mockResolvedValue(mockWallet),
        update: vi.fn().mockResolvedValue({
          ...mockWallet,
          balanceUsdt: new Prisma.Decimal(100), // 200 - 100
        }),
      },
      transaction: {
        create: vi.fn().mockResolvedValue({
          id: "tx-1",
          type: "WITHDRAWAL",
          amount: new Prisma.Decimal(100),
        }),
      },
    };

    vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
      return callback(tx);
    });

    const result = await syncWithdrawalPayoutStatus("withdrawal-1");

    expect(result.success).toBe(true);
    expect(result.status).toBe(WithdrawalStatus.COMPLETED);
    expect(result.balanceDeducted).toBe(true);
    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { id: "wallet-1" },
      data: {
        balanceUsdt: {
          decrement: new Prisma.Decimal(100),
        },
      },
    });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: "wallet-1",
        type: "WITHDRAWAL",
        amount: new Prisma.Decimal(100),
      }),
    });
  });

  it("should be idempotent - not deduct balance twice for COMPLETED withdrawal", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(100), // Already deducted
    });

    const completedWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      status: WithdrawalStatus.COMPLETED, // Already completed
      provider: WithdrawalProvider.NOWPAYMENTS,
      providerPayoutId: "payout-123",
      providerStatus: WithdrawalProviderStatus.COMPLETED,
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...completedWithdrawal,
      wallet: mockWallet,
    } as any);

    vi.mocked(getNowpaymentsPayoutStatus).mockResolvedValue({
      payoutId: "payout-123",
      status: "finished",
    });

    const tx = {
      withdrawal: {
        update: vi.fn().mockResolvedValue(completedWithdrawal),
      },
      wallet: {
        findUnique: vi.fn().mockResolvedValue(mockWallet),
        update: vi.fn(),
      },
      transaction: {
        create: vi.fn(),
      },
    };

    vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
      return callback(tx);
    });

    const result = await syncWithdrawalPayoutStatus("withdrawal-1");

    expect(result.success).toBe(true);
    expect(result.balanceDeducted).toBe(false); // Not deducted again
    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it("should mark withdrawal as REJECTED when payout status is failed", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(200),
    });

    const processingWithdrawal = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      status: WithdrawalStatus.PROCESSING,
      provider: WithdrawalProvider.NOWPAYMENTS,
      providerPayoutId: "payout-123",
      providerStatus: WithdrawalProviderStatus.PROCESSING,
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...processingWithdrawal,
      wallet: mockWallet,
    } as any);

    vi.mocked(getNowpaymentsPayoutStatus).mockResolvedValue({
      payoutId: "payout-123",
      status: "failed",
      errorMessage: "Insufficient funds in custody",
    });

    const tx = {
      withdrawal: {
        update: vi.fn().mockResolvedValue({
          ...processingWithdrawal,
          status: WithdrawalStatus.REJECTED,
          providerStatus: WithdrawalProviderStatus.FAILED,
          providerErrorMessage: "Insufficient funds in custody",
          processedAt: new Date(),
        }),
      },
      wallet: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      transaction: {
        create: vi.fn(),
      },
    };

    vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
      return callback(tx);
    });

    const result = await syncWithdrawalPayoutStatus("withdrawal-1");

    expect(result.success).toBe(true);
    expect(result.status).toBe(WithdrawalStatus.REJECTED);
    expect(result.balanceDeducted).toBe(false); // Balance not deducted for failed payout
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });

  it("should reject sync if providerPayoutId is not set", async () => {
    const mockWallet = createMockWallet({
      id: "wallet-1",
      balanceUsdt: new Prisma.Decimal(200),
    });

    const withdrawalWithoutPayout = {
      id: "withdrawal-1",
      walletId: "wallet-1",
      amount: new Prisma.Decimal(100),
      status: WithdrawalStatus.APPROVED,
      provider: WithdrawalProvider.NOWPAYMENTS,
      providerPayoutId: null, // No payout ID
    };

    vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
      ...withdrawalWithoutPayout,
      wallet: mockWallet,
    } as any);

    await expect(
      syncWithdrawalPayoutStatus("withdrawal-1")
    ).rejects.toThrow("providerPayoutId is not set");
  });
});

