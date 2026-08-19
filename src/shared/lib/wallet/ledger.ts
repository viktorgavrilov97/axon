import { Prisma, TransactionType } from "@prisma/client";
import { db } from "@/shared/lib/db";

/**
 * Wallet ledger — single source of truth for every movement of funds.
 *
 * Sign convention:
 *   - Credit operations (DEPOSIT, STRATEGY_PROFIT, STRATEGY_BONUS,
 *     STRATEGY_PRINCIPAL_RETURN, REFERRAL_PAYOUT, ADJUSTMENT credit) → POSITIVE amount.
 *   - Debit operations (WITHDRAWAL, STRATEGY_PRINCIPAL_LOCK, ADJUSTMENT debit) → NEGATIVE amount.
 *
 * Reconciliation invariant:
 *   For every wallet,  Wallet.balanceUsdt == SUM(Transaction.amount where walletId=W).
 *
 * All `Transaction` types in this codebase contribute to the wallet balance,
 * so `NON_BALANCE_AFFECTING_TYPES` is empty. (In some sister projects
 * STRATEGY_PROFIT is event-only and excluded — not the case here.)
 */
export const NON_BALANCE_AFFECTING_TYPES: TransactionType[] = [];

type LedgerTx = Prisma.TransactionClient;

type LedgerInput = {
  walletId: string;
  amount: Prisma.Decimal | number | string;
  type: TransactionType;
  meta?: Prisma.InputJsonValue;
  currency?: string;
};

function toDecimal(amount: Prisma.Decimal | number | string): Prisma.Decimal {
  return amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);
}

/**
 * Credit a wallet (deposit / profit / bonus / referral payout / principal return).
 * Writes a POSITIVE Transaction row and increments balanceUsdt — both within
 * the supplied transaction client (so the two are atomic).
 */
export async function creditWallet(
  tx: LedgerTx,
  input: LedgerInput
): Promise<{ transactionId: string; newBalance: Prisma.Decimal }> {
  const amount = toDecimal(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new Error(
      `creditWallet: amount must be positive (got ${amount.toString()}). ` +
        `Use debitWallet for withdrawals/locks.`
    );
  }

  const transaction = await tx.transaction.create({
    data: {
      walletId: input.walletId,
      type: input.type,
      amount,
      currency: input.currency ?? "USDT_POLYGON",
      meta: input.meta,
    },
    select: { id: true },
  });

  const wallet = await tx.wallet.update({
    where: { id: input.walletId },
    data: { balanceUsdt: { increment: amount } },
    select: { balanceUsdt: true },
  });

  return { transactionId: transaction.id, newBalance: wallet.balanceUsdt };
}

/**
 * Debit a wallet (withdrawal / strategy principal lock / adjustment debit).
 * Stores a NEGATIVE Transaction row and decrements balanceUsdt.
 *
 * Pass `allowOverdraft: true` to bypass the pre-check (e.g. when reversing a
 * test deposit that has already been spent on an active strategy).
 */
export async function debitWallet(
  tx: LedgerTx,
  input: LedgerInput & { allowOverdraft?: boolean }
): Promise<{ transactionId: string; newBalance: Prisma.Decimal }> {
  const amount = toDecimal(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new Error(
      `debitWallet: amount must be a positive magnitude (got ${amount.toString()}). ` +
        `It is negated internally.`
    );
  }

  if (!input.allowOverdraft) {
    const wallet = await tx.wallet.findUniqueOrThrow({
      where: { id: input.walletId },
      select: { balanceUsdt: true },
    });
    if (wallet.balanceUsdt.lessThan(amount)) {
      throw new Error(
        `debitWallet: insufficient balance ` +
          `(have ${wallet.balanceUsdt.toString()}, need ${amount.toString()})`
      );
    }
  }

  const signedAmount = amount.negated();

  const transaction = await tx.transaction.create({
    data: {
      walletId: input.walletId,
      type: input.type,
      amount: signedAmount,
      currency: input.currency ?? "USDT_POLYGON",
      meta: input.meta,
    },
    select: { id: true },
  });

  const wallet = await tx.wallet.update({
    where: { id: input.walletId },
    data: { balanceUsdt: { increment: signedAmount } },
    select: { balanceUsdt: true },
  });

  return { transactionId: transaction.id, newBalance: wallet.balanceUsdt };
}

export type ReconciliationRow = {
  walletId: string;
  userId: string;
  storedBalance: Prisma.Decimal;
  ledgerSum: Prisma.Decimal;
  drift: Prisma.Decimal;
};

/**
 * Compute drift between stored Wallet.balanceUsdt and SUM(Transaction.amount)
 * for every wallet. Read-only — never mutates anything.
 */
export async function reconcileAllWallets(): Promise<ReconciliationRow[]> {
  const wallets = await db.wallet.findMany({
    select: { id: true, userId: true, balanceUsdt: true },
  });

  const sums = NON_BALANCE_AFFECTING_TYPES.length
    ? await db.transaction.groupBy({
        by: ["walletId"],
        where: { type: { notIn: NON_BALANCE_AFFECTING_TYPES } },
        _sum: { amount: true },
      })
    : await db.transaction.groupBy({
        by: ["walletId"],
        _sum: { amount: true },
      });

  const sumByWallet = new Map(
    sums.map((row) => [row.walletId, row._sum.amount ?? new Prisma.Decimal(0)])
  );

  return wallets.map((w) => {
    const ledgerSum = sumByWallet.get(w.id) ?? new Prisma.Decimal(0);
    const drift = w.balanceUsdt.minus(ledgerSum);
    return {
      walletId: w.id,
      userId: w.userId,
      storedBalance: w.balanceUsdt,
      ledgerSum,
      drift,
    };
  });
}
