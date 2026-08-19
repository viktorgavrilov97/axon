import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateWithdrawalStatusAction } from "@/modules/admin/api/update-withdrawal-status";
import { createMockUser, createMockWallet } from "./test-utils";
import { Prisma, WithdrawalStatus, WithdrawalProvider } from "@prisma/client";

// Mock database
vi.mock("@/shared/lib/db", () => {
  const mockDb = {
    withdrawal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    wallet: {
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      withdrawal: {
        update: vi.fn(),
      },
      wallet: {
        update: vi.fn(),
      },
    })),
  };
  return { db: mockDb };
});

// Mock auth
vi.mock("@/shared/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock withdrawal payout service
vi.mock("@/modules/wallet/lib/withdrawal-payout-service", () => ({
  triggerWithdrawalPayout: vi.fn(),
}));

import { db } from "@/shared/lib/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { triggerWithdrawalPayout } from "@/modules/wallet/lib/withdrawal-payout-service";

describe("updateWithdrawalStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PENDING → APPROVED", () => {
    it("should approve withdrawal and trigger payout for NOWPAYMENTS provider", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

      const mockWallet = createMockWallet({
        id: "wallet-1",
        balanceUsdt: new Prisma.Decimal(200),
      });

      const mockWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.PENDING,
        provider: WithdrawalProvider.NOWPAYMENTS,
        toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...mockWithdrawal,
        wallet: mockWallet,
      } as any);

      vi.mocked(triggerWithdrawalPayout).mockResolvedValue({
        success: true,
        payoutId: "payout-123",
      });

      const tx = {
        withdrawal: {
          update: vi.fn().mockResolvedValue({
            ...mockWithdrawal,
            status: WithdrawalStatus.APPROVED,
          }),
        },
        wallet: {
          update: vi.fn(),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        return callback(tx);
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "APPROVED");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.success).toBe(true);
      expect(tx.withdrawal.update).toHaveBeenCalled();
      expect(tx.wallet.update).not.toHaveBeenCalled(); // Balance not changed yet
      expect(triggerWithdrawalPayout).toHaveBeenCalledWith("withdrawal-1", "admin-1");
    });

    it("should approve withdrawal without triggering payout for INTERNAL provider", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

      const mockWallet = createMockWallet({
        id: "wallet-1",
        balanceUsdt: new Prisma.Decimal(200),
      });

      const mockWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.PENDING,
        provider: WithdrawalProvider.INTERNAL, // Manual processing
        toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...mockWithdrawal,
        wallet: mockWallet,
      } as any);

      const tx = {
        withdrawal: {
          update: vi.fn().mockResolvedValue({
            ...mockWithdrawal,
            status: WithdrawalStatus.APPROVED,
          }),
        },
        wallet: {
          update: vi.fn(),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        return callback(tx);
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "APPROVED");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.success).toBe(true);
      expect(triggerWithdrawalPayout).not.toHaveBeenCalled(); // No payout for INTERNAL
    });
  });

  describe("APPROVED → COMPLETED", () => {
    it("should complete withdrawal without deducting balance for NOWPAYMENTS (balance deducted in sync)", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

      const mockWallet = createMockWallet({
        id: "wallet-1",
        balanceUsdt: new Prisma.Decimal(200),
      });

      const approvedWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.APPROVED,
        provider: WithdrawalProvider.NOWPAYMENTS,
        providerPayoutId: "payout-123", // Already has payout - balance deducted in syncWithdrawalPayoutStatus
        toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...approvedWithdrawal,
        wallet: mockWallet,
      } as any);

      const tx = {
        withdrawal: {
          update: vi.fn().mockResolvedValue({
            ...approvedWithdrawal,
            status: WithdrawalStatus.COMPLETED,
            processedAt: new Date(),
            txHash: "0xTxHash123",
          }),
        },
        wallet: {
          update: vi.fn(),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        return callback(tx);
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "COMPLETED");
      formData.append("txHash", "0xTxHash123");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.success).toBe(true);
      expect(tx.withdrawal.update).toHaveBeenCalledWith({
        where: { id: "withdrawal-1" },
        data: {
          status: WithdrawalStatus.COMPLETED,
          processedAt: expect.any(Date),
          txHash: "0xTxHash123",
        },
      });
      // For NOWPAYMENTS with payoutId, balance is deducted in syncWithdrawalPayoutStatus, not here
      expect(tx.wallet.update).not.toHaveBeenCalled();
    });

    it("should complete withdrawal and deduct balance for INTERNAL provider", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

      const mockWallet = createMockWallet({
        id: "wallet-1",
        balanceUsdt: new Prisma.Decimal(200),
      });

      const approvedWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.APPROVED,
        provider: WithdrawalProvider.INTERNAL, // Manual processing - balance deducted here
        providerPayoutId: null,
        toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...approvedWithdrawal,
        wallet: mockWallet,
      } as any);

      const tx = {
        withdrawal: {
          update: vi.fn().mockResolvedValue({
            ...approvedWithdrawal,
            status: WithdrawalStatus.COMPLETED,
            processedAt: new Date(),
            txHash: "0xTxHash123",
          }),
        },
        wallet: {
          update: vi.fn().mockResolvedValue({
            ...mockWallet,
            balanceUsdt: new Prisma.Decimal(100), // 200 - 100
          }),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        return callback(tx);
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "COMPLETED");
      formData.append("txHash", "0xTxHash123");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.success).toBe(true);
      expect(tx.wallet.update).toHaveBeenCalledWith({
        where: { id: "wallet-1" },
        data: {
          balanceUsdt: {
            decrement: new Prisma.Decimal(100),
          },
        },
      });
    });

    it("should reject completion if balance is insufficient", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

      const mockWallet = createMockWallet({
        id: "wallet-1",
        balanceUsdt: new Prisma.Decimal(50), // Less than withdrawal amount
      });

      const approvedWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.APPROVED,
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...approvedWithdrawal,
        wallet: mockWallet,
      } as any);

      const tx = {
        withdrawal: {
          update: vi.fn(),
        },
        wallet: {
          update: vi.fn().mockImplementation(() => {
            // Simulate balance check in transaction
            if (mockWallet.balanceUsdt.toNumber() < approvedWithdrawal.amount.toNumber()) {
              throw new Error("Недостаточно средств на балансе для списания");
            }
            return Promise.resolve(mockWallet);
          }),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        try {
          return await callback(tx);
        } catch (error) {
          throw error;
        }
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "COMPLETED");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.error).toContain("Недостаточно средств");
    });

    it("should be idempotent - not deduct balance twice for COMPLETED", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

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
        processedAt: new Date(),
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...completedWithdrawal,
        wallet: mockWallet,
      } as any);

      const tx = {
        withdrawal: {
          update: vi.fn().mockResolvedValue(completedWithdrawal),
        },
        wallet: {
          update: vi.fn(),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        return callback(tx);
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "COMPLETED");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.success).toBe(true);
      // Balance should not be deducted again
      expect(tx.wallet.update).not.toHaveBeenCalled();
    });
  });

  describe("PENDING → REJECTED", () => {
    it("should reject withdrawal with reason without changing balance", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

      const mockWallet = createMockWallet({
        id: "wallet-1",
        balanceUsdt: new Prisma.Decimal(200),
      });

      const mockWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.PENDING,
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...mockWithdrawal,
        wallet: mockWallet,
      } as any);

      const tx = {
        withdrawal: {
          update: vi.fn().mockResolvedValue({
            ...mockWithdrawal,
            status: WithdrawalStatus.REJECTED,
            processedAt: new Date(),
            rejectionReason: "Invalid address format",
          }),
        },
        wallet: {
          update: vi.fn(),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        return callback(tx);
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "REJECTED");
      formData.append("rejectionReason", "Invalid address format");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.success).toBe(true);
      // Verify withdrawal was updated (transaction callback was called)
      expect(tx.withdrawal.update).toHaveBeenCalled();
      expect(tx.wallet.update).not.toHaveBeenCalled(); // Balance not changed
    });
  });

  describe("Access Control", () => {
    it("should reject action from USER role", async () => {
      const userUser = createMockUser({
        id: "user-1",
        role: "USER",
      });

      vi.mocked(getCurrentUser).mockResolvedValue(userUser);

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "APPROVED");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.error).toBe("Недостаточно прав");
      expect(db.withdrawal.findUnique).not.toHaveBeenCalled();
    });

    it("should allow action from ADMIN role", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

      const mockWallet = createMockWallet({ id: "wallet-1" });
      const mockWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.PENDING,
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...mockWithdrawal,
        wallet: mockWallet,
      } as any);

      const tx = {
        withdrawal: {
          update: vi.fn().mockResolvedValue({
            ...mockWithdrawal,
            status: WithdrawalStatus.APPROVED,
          }),
        },
        wallet: {
          update: vi.fn(),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        return callback(tx);
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "APPROVED");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.success).toBe(true);
    });

    it("should allow action from SUPERADMIN role", async () => {
      const superAdminUser = createMockUser({
        id: "superadmin-1",
        role: "SUPERADMIN",
      });

      const mockWallet = createMockWallet({ id: "wallet-1" });
      const mockWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.PENDING,
      };

      vi.mocked(getCurrentUser).mockResolvedValue(superAdminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...mockWithdrawal,
        wallet: mockWallet,
      } as any);

      const tx = {
        withdrawal: {
          update: vi.fn().mockResolvedValue({
            ...mockWithdrawal,
            status: WithdrawalStatus.APPROVED,
          }),
        },
        wallet: {
          update: vi.fn(),
        },
      };

      vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
        return callback(tx);
      });

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "APPROVED");

      const result = await updateWithdrawalStatusAction(formData);

      expect(result.success).toBe(true);
    });
  });

  describe("Status Transition Validation", () => {
    it("should prevent changing COMPLETED withdrawal status", async () => {
      const adminUser = createMockUser({
        id: "admin-1",
        role: "ADMIN",
      });

      const completedWithdrawal = {
        id: "withdrawal-1",
        walletId: "wallet-1",
        amount: new Prisma.Decimal(100),
        status: WithdrawalStatus.COMPLETED,
        provider: WithdrawalProvider.NOWPAYMENTS,
        providerPayoutId: "payout-123",
        processedAt: new Date(),
      };

      vi.mocked(getCurrentUser).mockResolvedValue(adminUser);
      vi.mocked(db.withdrawal.findUnique).mockResolvedValue({
        ...completedWithdrawal,
        wallet: createMockWallet(),
      } as any);

      const formData = new FormData();
      formData.append("withdrawalId", "withdrawal-1");
      formData.append("status", "REJECTED"); // Try to change COMPLETED

      const result = await updateWithdrawalStatusAction(formData);

      // Should reject the change
      expect(result.error).toBe("Нельзя изменить статус завершённого вывода");
      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });
});

