import { getCurrentUser } from "@/shared/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/shared/lib/db";
import { TestBalancesClient } from "./test-balances-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TestBalancesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPERADMIN") {
    redirect("/operations");
  }

  const [users, adminDeposits] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        wallet: { select: { balanceUsdt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.deposit.findMany({
      where: { origin: { in: ["TEST", "MANUAL"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        amountUsdt: true,
        status: true,
        origin: true,
        createdAt: true,
        confirmedAt: true,
        userId: true,
        user: { select: { email: true, displayName: true } },
      },
    }),
  ]);

  return (
    <div className="p-4">
      <h1 className="text-display mb-2">Test Balances</h1>
      <p className="text-body text-white-700 mb-6">
        Создание синтетических TEST-депозитов и откат TEST/MANUAL — REAL никогда не задевается.
      </p>
      <TestBalancesClient
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          balance: Number(u.wallet?.balanceUsdt ?? 0),
        }))}
        deposits={adminDeposits.map((d) => ({
          id: d.id,
          userId: d.userId,
          userEmail: d.user.email,
          userDisplayName: d.user.displayName,
          amountUsdt: Number(d.amountUsdt),
          status: d.status,
          origin: d.origin,
          createdAt: d.createdAt.toISOString(),
          confirmedAt: d.confirmedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
