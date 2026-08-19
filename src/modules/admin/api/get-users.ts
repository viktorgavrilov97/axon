"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";

export async function getUsersAction(page: number = 1, limit: number = 50) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return { error: "Insufficient permissions" };
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    db.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        role: true,
        createdAt: true,
        sessions: {
          take: 1,
          orderBy: { expires: "desc" },
          select: { expires: true },
        },
        wallet: {
          select: {
            balanceUsdt: true,
          },
        },
      },
    }),
    db.user.count(),
  ]);

  return {
    success: true,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      avatarColor: u.avatarColor,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.sessions[0]?.expires || null,
      balance: u.wallet ? Number(u.wallet.balanceUsdt) : 0,
    })),
    total,
    page,
    limit,
  };
}

