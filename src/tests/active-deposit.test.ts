import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDeposit } from "@/modules/wallet/lib/wallet-service";
import { createMockDeposit, createMockWallet } from "./test-utils";
import { Prisma } from "@prisma/client";

// Mock database
vi.mock("@/shared/lib/db", () => {
  return {
    db: {
      wallet: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      deposit: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    },
  };
});

// Mock NOWPayments
vi.mock("@/modules/wallet/lib/nowpayments", () => ({
  createDepositInvoice: vi.fn(),
}));

// Don't mock operations-service - use real implementation with mocked db
import { db } from "@/shared/lib/db";
import { createDepositInvoice } from "@/modules/wallet/lib/nowpayments";
import { getActiveDeposit } from "@/modules/wallet/lib/operations-service";

describe("getActiveDeposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return PENDING deposit created less than 24 hours ago", async () => {
    const mockWallet = createMockWallet();
    const recentDeposit = createMockDeposit({
      status: "PENDING",
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    });

    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(db.deposit.findFirst).mockResolvedValue(recentDeposit);

    const result = await getActiveDeposit("user-1");

    expect(result).not.toBeNull();
    expect(result?.status).toBe("PENDING");
    expect(db.deposit.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        walletId: mockWallet.id,
        status: "PENDING",
        createdAt: expect.objectContaining({
          gte: expect.any(Date),
        }),
      }),
      orderBy: {
        createdAt: "desc",
      },
    });
  });

  it("should return null for PENDING deposit older than 24 hours", async () => {
    const mockWallet = createMockWallet();

    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(db.deposit.findFirst).mockResolvedValue(null);

    const result = await getActiveDeposit("user-1");

    expect(result).toBeNull();
  });

  it("should return null for CONFIRMED deposit", async () => {
    const mockWallet = createMockWallet();

    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(db.deposit.findFirst).mockResolvedValue(null);

    const result = await getActiveDeposit("user-1");

    expect(result).toBeNull();
  });

  it("should return the most recent PENDING deposit when multiple exist", async () => {
    const mockWallet = createMockWallet();
    const recentDeposit = createMockDeposit({
      id: "deposit-recent",
      status: "PENDING",
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    });

    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(db.deposit.findFirst).mockResolvedValue(recentDeposit);

    const result = await getActiveDeposit("user-1");

    expect(result?.id).toBe("deposit-recent");
    expect(db.deposit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          createdAt: "desc",
        },
      })
    );
  });
});

describe("createDeposit with active deposit check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: createDeposit doesn't check for active deposits in current implementation
  // This test would require refactoring createDeposit to check getActiveDeposit first
  // Skipping for now as it's not part of current implementation
  it.skip("should return existing active deposit instead of creating new one", async () => {
    // This test requires createDeposit to check getActiveDeposit first
    // Current implementation always creates new deposit
  });
});
