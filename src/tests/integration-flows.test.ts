import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDeposit } from "@/modules/wallet/lib/wallet-service";
import { syncDepositStatusFromProvider } from "@/modules/wallet/lib/wallet-service";
import { getActiveDeposit } from "@/modules/wallet/lib/operations-service";
import {
  registerUser,
  loginUser,
} from "@/modules/identity/lib/auth-service";
import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/modules/identity/api/reset-password";
import { createMockUser, createMockWallet, createMockDeposit } from "./test-utils";
import { Prisma, DepositStatus } from "@prisma/client";

// Mock database
vi.mock("@/shared/lib/db", () => {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deposit: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    otpCode: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({
      deposit: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      wallet: {
        update: vi.fn(),
      },
    })),
  };
  return { db: mockDb };
});

// Mock NOWPayments
vi.mock("@/modules/wallet/lib/nowpayments", () => ({
  createDepositInvoice: vi.fn(),
  getPaymentStatus: vi.fn(),
}));

// Mock realtime
vi.mock("@/lib/realtime/deposits-listener", () => ({
  emitDepositChange: vi.fn(),
}));

// Mock OTP
vi.mock("@/modules/identity/lib/otp", () => ({
  generateOtpCode: () => "123456",
  createOtpCode: vi.fn(),
  verifyOtpCode: vi.fn(),
}));

// Mock email
vi.mock("@/modules/identity/lib/email", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock NextAuth
vi.mock("@/modules/identity/lib/auth", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@/shared/lib/db";
import { createDepositInvoice, getPaymentStatus } from "@/modules/wallet/lib/nowpayments";
import { hashPassword } from "@/modules/identity/lib/password";
import { verifyOtpCode } from "@/modules/identity/lib/otp";

describe("Integration: Full Deposit Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full deposit flow: create → sync → confirm → balance credited", async () => {
    // Step 1: Create user and wallet
    const mockUser = createMockUser({
      id: "user-1",
      email: "test@example.com",
    });

    const mockWallet = createMockWallet({
      id: "wallet-1",
      userId: "user-1",
      balanceUsdt: new Prisma.Decimal(0),
    });

    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(db.wallet.findUnique).mockResolvedValue(mockWallet);
    vi.mocked(db.wallet.create).mockResolvedValue(mockWallet);

    // Step 2: Create deposit
    const mockDeposit = createMockDeposit({
      id: "deposit-1",
      userId: "user-1",
      walletId: "wallet-1",
      status: DepositStatus.PENDING,
      amountUsdt: new Prisma.Decimal(100),
      providerPaymentId: "payment-123",
      payAddress: "0xTestAddress",
    });

    vi.mocked(createDepositInvoice).mockResolvedValue({
      paymentId: "payment-123",
      payAddress: "0xTestAddress",
      payAmount: 99.5,
      payCurrency: "usdtmatic",
      expiresAt: new Date(Date.now() + 3600000),
    });

    vi.mocked(db.deposit.create).mockResolvedValue(mockDeposit);

    const createResult = await createDeposit("user-1", 100);

    expect(createResult.deposit.status).toBe(DepositStatus.PENDING);
    expect(createResult.deposit.amountUsdt.toNumber()).toBe(100);

    // Step 3: Check active deposit
    vi.mocked(db.deposit.findFirst).mockResolvedValue(mockDeposit);

    const activeDeposit = await getActiveDeposit("user-1");

    expect(activeDeposit).not.toBeNull();
    expect(activeDeposit?.status).toBe(DepositStatus.PENDING);

    // Step 4: Sync status from NOWPayments (CONFIRMED)
    vi.mocked(getPaymentStatus).mockResolvedValue({
      payment_status: "finished", // Maps to CONFIRMED
      pay_amount: 99.5,
      pay_address: "0xTestAddress",
      payin_hash: "0xTxHash123",
    } as any);

    vi.mocked(db.deposit.findUnique).mockResolvedValue({
      ...mockDeposit,
      wallet: mockWallet,
      user: { id: "user-1" },
    } as any);

    const tx = {
      deposit: {
        findUnique: vi.fn().mockResolvedValue(mockDeposit),
        update: vi.fn().mockResolvedValue({
          ...mockDeposit,
          status: DepositStatus.CONFIRMED,
          confirmedAt: new Date(),
        }),
      },
      wallet: {
        update: vi.fn().mockResolvedValue({
          ...mockWallet,
          balanceUsdt: new Prisma.Decimal(100), // Credited
        }),
      },
    };

    vi.mocked(db.$transaction).mockImplementationOnce(async (callback) => {
      return callback(tx);
    });

    const syncResult = await syncDepositStatusFromProvider("deposit-1");

    expect(syncResult.deposit.status).toBe(DepositStatus.CONFIRMED);
    expect(syncResult.balanceCredited).toBe(true);
    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { id: "wallet-1" },
      data: {
        balanceUsdt: {
          increment: new Prisma.Decimal(100),
        },
      },
    });

    // Step 5: Active deposit should be null after confirmation
    vi.mocked(db.deposit.findFirst).mockResolvedValue(null);

    const activeDepositAfter = await getActiveDeposit("user-1");

    expect(activeDepositAfter).toBeNull();
  });
});

describe("Integration: Reset Password Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full reset password flow: register → forgot → reset → login", async () => {
    // Step 1: Register user
    const mockUser = createMockUser({
      id: "user-1",
      email: "test@example.com",
      passwordHash: await hashPassword("OldPass123!"),
    });

    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue(mockUser);
    vi.mocked(db.otpCode.create).mockResolvedValue({
      id: "otp-1",
      email: "test@example.com",
      code: "123456",
      type: "EMAIL_VERIFICATION",
      userId: "user-1",
      consumed: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
    } as any);

    const registerResult = await registerUser({
      email: "test@example.com",
      password: "OldPass123!",
    });

    expect(registerResult.user.email).toBe("test@example.com");

    // Step 2: Request password reset
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(db.otpCode.create).mockResolvedValue({
      id: "otp-reset",
      email: "test@example.com",
      code: "654321",
      type: "PASSWORD_RESET",
      userId: "user-1",
      consumed: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
    } as any);

    const resetRequestFormData = new FormData();
    resetRequestFormData.append("email", "test@example.com");

    const resetRequestResult = await requestPasswordResetAction(resetRequestFormData);

    expect(resetRequestResult.success).toBe(true);

    // Step 3: Reset password with OTP
    const mockOtp = {
      id: "otp-reset",
      email: "test@example.com",
      code: "654321",
      type: "PASSWORD_RESET",
      userId: "user-1",
      consumed: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
    };

    vi.mocked(verifyOtpCode).mockResolvedValue({
      valid: true,
      userId: "user-1",
    });
    // Mock verifyOtpCode to return valid result
    vi.mocked(verifyOtpCode).mockResolvedValue({
      valid: true,
      userId: "user-1",
    });
    
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(db.user.update).mockResolvedValue({
      ...mockUser,
      passwordHash: await hashPassword("NewPass123!"),
    } as any);
    vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 0 });

    const resetFormData = new FormData();
    resetFormData.append("email", "test@example.com");
    resetFormData.append("code", "654321");
    resetFormData.append("password", "NewPass123!");
    resetFormData.append("confirmPassword", "NewPass123!");

    const resetResult = await resetPasswordAction(resetFormData);

    expect(resetResult.success).toBe(true);
    expect(db.user.update).toHaveBeenCalled();
    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });

    // Step 4: Login with new password should succeed
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...mockUser,
      passwordHash: await hashPassword("NewPass123!"),
      isTwoFactorEnabled: false,
    } as any);

    const loginResult = await loginUser({
      email: "test@example.com",
      password: "NewPass123!",
    });

    expect(loginResult.user.email).toBe("test@example.com");
    expect(loginResult.requiresTwoFactor).toBe(false);

    // Step 5: Login with old password should fail
    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...mockUser,
      passwordHash: await hashPassword("NewPass123!"), // Updated hash
      isTwoFactorEnabled: false,
    } as any);

    await expect(
      loginUser({
        email: "test@example.com",
        password: "OldPass123!", // Old password
      })
    ).rejects.toThrow();
  });
});

