"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createTestDepositAction } from "@/modules/admin/api/create-test-deposit";
import { purgeTestDepositsAction } from "@/modules/admin/api/purge-test-deposits";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  balance: number;
};

type DepositRow = {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string | null;
  amountUsdt: number;
  status: string;
  origin: "TEST" | "MANUAL" | "REAL";
  createdAt: string;
  confirmedAt: string | null;
};

interface Props {
  users: UserRow[];
  deposits: DepositRow[];
}

const inputClass =
  "w-full px-4 py-2 bg-surface-900 border border-white-500 text-white-900 text-body rounded-xl focus:outline-none focus:border-white-800 transition-all";

const primaryButton =
  "px-5 py-2.5 rounded-xl text-body bg-white-900 text-surface-900 hover:bg-white-800 disabled:opacity-50 disabled:hover:bg-white-900 transition-colors";

const dangerButton =
  "px-5 py-2.5 rounded-xl text-body border border-redhaze text-redhaze hover:bg-redhaze/10 disabled:opacity-50 transition-colors";

const sectionClass = "bg-onsurface-900 rounded-xl p-6";

export function TestBalancesClient({ users, deposits }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [includeManual, setIncludeManual] = useState(false);

  const onCreate = () => {
    if (!selectedUserId || !amount) {
      toast.error("Select user and amount");
      return;
    }
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      toast.error("Invalid amount");
      return;
    }
    startTransition(async () => {
      const res = await createTestDepositAction({
        userId: selectedUserId,
        amountUsdt: amt,
        note: note || undefined,
      });
      if (res.success) {
        toast.success(`Test deposit created (${amt} USDT)`);
        setAmount("");
        setNote("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onPurgeRow = (depositId: string) => {
    startTransition(async () => {
      const res = await purgeTestDepositsAction({ depositId });
      if (res.success) {
        toast.success(`Reversed ${res.purged} deposit(s)`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onPurgeBulk = () => {
    if (
      !confirm(
        includeManual
          ? "Откатить ВСЕ TEST + MANUAL депозиты? REAL не пострадают."
          : "Откатить ВСЕ TEST депозиты?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await purgeTestDepositsAction({ includeManual });
      if (res.success) {
        toast.success(`Purged ${res.purged} deposit(s)`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Create test deposit */}
      <section className={sectionClass}>
        <h2 className="text-heading text-white-900 mb-4">Создать TEST-депозит</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="block">
            <span className="block text-small text-white-700 mb-2">User</span>
            <select
              className={inputClass}
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="" className="bg-surface-900">— select —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-surface-900">
                  {u.email}
                  {u.displayName ? ` · ${u.displayName}` : ""} · {u.balance} USDT
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-small text-white-700 mb-2">Amount (USDT)</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block text-small text-white-700 mb-2">Note (optional)</span>
            <input
              type="text"
              maxLength={500}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <button disabled={pending} onClick={onCreate} className={primaryButton}>
            {pending ? "..." : "Create"}
          </button>
        </div>
      </section>

      {/* Bulk purge */}
      <section className={sectionClass}>
        <h2 className="text-heading text-white-900 mb-4">Аннулировать тестовые балансы</h2>
        <label className="flex items-center gap-2 mb-4 text-body text-white-900 cursor-pointer">
          <input
            type="checkbox"
            checked={includeManual}
            onChange={(e) => setIncludeManual(e.target.checked)}
            className="accent-white-900"
          />
          <span>Также включить MANUAL (admin-confirmed) депозиты</span>
        </label>
        <button disabled={pending} onClick={onPurgeBulk} className={dangerButton}>
          {pending ? "..." : "Purge"}
        </button>
      </section>

      {/* Table */}
      <section>
        <h2 className="text-heading text-white-900 mb-3">
          TEST + MANUAL депозиты ({deposits.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-separate" style={{ borderSpacing: "0 8px" }}>
            <thead>
              <tr className="text-left text-small text-white-700">
                <th className="px-4 pb-2">Created</th>
                <th className="px-4 pb-2">User</th>
                <th className="px-4 pb-2">Origin</th>
                <th className="px-4 pb-2">Status</th>
                <th className="px-4 pb-2 text-right">Amount</th>
                <th className="px-4 pb-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr
                  key={d.id}
                  className="bg-onsurface-900 hover:bg-onsurface-800 transition-colors"
                >
                  <td className="px-4 py-3 rounded-l-xl text-small text-white-700">
                    {new Date(d.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 text-body text-white-900">
                    {d.userEmail}
                    {d.userDisplayName ? (
                      <span className="text-white-700"> · {d.userDisplayName}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-small ${
                        d.origin === "TEST"
                          ? "bg-mint/15 text-mint"
                          : d.origin === "MANUAL"
                            ? "bg-yellow/15 text-yellow"
                            : "bg-onsurface-800 text-white-900"
                      }`}
                    >
                      {d.origin}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body text-white-700">{d.status}</td>
                  <td className="px-4 py-3 text-right text-body text-white-900 font-medium">
                    {d.amountUsdt}
                  </td>
                  <td className="px-4 py-3 rounded-r-xl text-right">
                    <button
                      disabled={pending}
                      onClick={() => onPurgeRow(d.id)}
                      className="text-redhaze hover:underline disabled:opacity-50"
                    >
                      Reverse
                    </button>
                  </td>
                </tr>
              ))}
              {deposits.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white-700">
                    Нет TEST/MANUAL депозитов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
