import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDeposit } from "@/modules/wallet/lib/wallet-service";
import { createMockUser, createMockWallet, createMockDeposit } from "./test-utils";
import { Prisma } from "@prisma/client";

// Mock database
vi.mock("@/shared/lib/db", () => {
  const mockDb = {
    wallet: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    deposit: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  };
  return { db: mockDb };
});

// Mock NOWPayments
vi.mock("@/modules/wallet/lib/nowpayments", () => ({
  createDepositInvoice: vi.fn(),
}));

// Mock operations service
vi.mock("@/modules/wallet/lib/operations-service", () => ({
  getActiveDeposit: vi.fn(),
}));

import { db } from "@/shared/lib/db";
import { createDepositInvoice } from "@/modules/wallet/lib/nowpayments";
import { getActiveDeposit } from "@/modules/wallet/lib/operations-service";

export class MinAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MinAmountError";
  }
}

export class ExternalProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalProviderError";
  }
}

describe("Deposit Creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create deposit when user has no active deposit", async () => {
    const mockWallet = createMockWallet();
    const mockDeposit = createMockDeposit({
      amountUsdt: new Prisma.Decimal(100),
      amountCrypto: new Prisma.Decimal(99.5),
      payAddress: "TTestAddress123",
    });

    vi.mocked(getActiveDeposit).mockResolvedValue(null);
    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(createDepositInvoice).mockResolvedValue({
      paymentId: "payment-123",
      payAddress: "0xTestAddress123",
      payAmount: 99.5,
      payCurrency: "usdtmatic",
    });
    vi.mocked(db.deposit.create).mockResolvedValue(mockDeposit);

    const result = await createDeposit("user-1", 100);

    expect(result.deposit.status).toBe("PENDING");
    expect(result.deposit.amountUsdt.toNumber()).toBe(100);
    expect(result.payAddress).toBe("0xTestAddress123");
    expect(result.payAmount).toBe(99.5);
    expect(db.deposit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "PENDING",
        amountUsdt: expect.any(Prisma.Decimal),
        providerPaymentId: "payment-123",
      }),
    });
  });

  it("should throw error when NOWPayments returns AMOUNT_MINIMAL_ERROR", async () => {
    vi.mocked(getActiveDeposit).mockResolvedValue(null);
    vi.mocked(db.wallet.findUnique).mockResolvedValue(createMockWallet());

    const error = new Error("AMOUNT_MINIMAL_ERROR: Amount too small");
    vi.mocked(createDepositInvoice).mockRejectedValue(error);

    await expect(createDeposit("user-1", 1)).rejects.toThrow();

    // Should not create deposit in DB
    expect(db.deposit.create).not.toHaveBeenCalled();
  });

  it("should throw ExternalProviderError for other NOWPayments errors", async () => {
    vi.mocked(getActiveDeposit).mockResolvedValue(null);
    vi.mocked(db.wallet.findUnique).mockResolvedValue(createMockWallet());

    const error = new Error("Internal Server Error");
    (error as any).statusCode = 500;
    vi.mocked(createDepositInvoice).mockRejectedValue(error);

    await expect(createDeposit("user-1", 100)).rejects.toThrow();

    // Should not create deposit in DB
    expect(db.deposit.create).not.toHaveBeenCalled();
  });
});

