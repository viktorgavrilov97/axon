import type { User, Deposit, Wallet } from "@prisma/client";
import { Prisma } from "@prisma/client";

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: "user-1",
    email: "test@example.com",
    emailVerified: null,
    passwordHash: "$2a$12$hashedpassword",
    name: null,
    phone: null,
    image: null,
    isTwoFactorEnabled: false,
    role: "USER",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

/**
 * Create a mock wallet for testing
 */
export function createMockWallet(overrides?: Partial<Wallet>): Wallet {
  return {
    id: "wallet-1",
    userId: "user-1",
    balanceUsdt: new Prisma.Decimal(0),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Wallet;
}

/**
 * Create a mock deposit for testing
 */
export function createMockDeposit(overrides?: Partial<Deposit>): Deposit {
  return {
    id: "deposit-1",
    userId: "user-1",
    walletId: "wallet-1",
    provider: "NOWPAYMENTS",
    providerPaymentId: "payment-123",
    providerStatus: null,
    amountUsdt: new Prisma.Decimal(100),
    amountCrypto: null,
    payCurrency: "usdtmatic",
    payAddress: "0xTestAddress123",
    txHash: null,
    status: "PENDING",
    createdAt: new Date(),
    confirmedAt: null,
    ...overrides,
  } as Deposit;
}

