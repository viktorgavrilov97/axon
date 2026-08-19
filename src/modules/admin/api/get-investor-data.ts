"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";

export async function getInvestorDataAction(userId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      console.error("[getInvestorDataAction] Insufficient permissions", { userId, userRole: user?.role });
      return { error: "Insufficient permissions" };
    }

    console.log("[getInvestorDataAction] Fetching data for userId:", userId);

    // Get all required data
    const [
      wallet,
      deposits,
      withdrawals,
      strategies,
      strategyProfits,
      principalReturns,
      userData,
      referralPayouts,
      totalReferrals,
    ] = await Promise.all([
    // Wallet balance
    db.wallet.findUnique({
      where: { userId },
      select: {
        balanceUsdt: true,
      },
    }),
    // Total Deposits (status = "paid")
    db.deposit.findMany({
      where: {
        userId,
        status: "paid",
      },
      select: {
        amountUsdt: true,
      },
    }),
    // Total Withdrawals (status = "COMPLETED")
    db.withdrawal.findMany({
      where: {
        wallet: { userId },
        status: "COMPLETED",
      },
      select: {
        amount: true,
      },
    }),
    // Active Investments (status = "ACTIVE")
    db.strategy.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: {
        amount: true,
      },
    }),
    // Total Strategy Profit (PROFIT_DAY and BONUS_MULTIPLIER)
    db.strategyProfit.findMany({
      where: {
        userId,
        type: {
          in: ["PROFIT_DAY", "BONUS_MULTIPLIER"],
        },
      },
      select: {
        amount: true,
      },
    }),
    // Returned Principal
    db.strategyPrincipalReturn.findMany({
      where: {
        userId,
      },
      select: {
        amount: true,
      },
    }),
    // User referral turnover
    db.user.findUnique({
      where: { id: userId },
      select: {
        referralTurnover: true,
      },
    }),
    // Referral Payouts
    db.referralPayout.findMany({
      where: {
        parentUserId: userId,
      },
      select: {
        amount: true,
      },
    }),
    // Total Referrals (count only first level referrals)
    db.user.count({
      where: {
        referralParentId: userId,
      },
    }),
  ]);

    // Calculate totals
    const balance = wallet ? Number(wallet.balanceUsdt) : 0;
    const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amountUsdt), 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
    const activeInvestments = strategies.reduce((sum, s) => sum + Number(s.amount), 0);
    const totalStrategyProfit = strategyProfits.reduce((sum, p) => sum + Number(p.amount), 0);
    const returnedPrincipal = principalReturns.reduce((sum, r) => sum + Number(r.amount), 0);
    const referralTurnover = userData?.referralTurnover ? Number(userData.referralTurnover) : 0;
    const referralPayoutsTotal = referralPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

    console.log("[getInvestorDataAction] Data fetched successfully", {
      balance,
      totalDeposits,
      totalWithdrawals,
      activeInvestments,
      totalStrategyProfit,
    });

    return {
      success: true,
      balance,
      kpis: {
        totalDeposits,
        totalWithdrawals,
        activeInvestments,
        totalStrategyProfit,
        returnedPrincipal,
        referralTurnover,
        referralPayouts: referralPayoutsTotal,
        totalReferrals,
      },
    };
  } catch (error) {
    console.error("[getInvestorDataAction] Error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to load investor data",
    };
  }
}

