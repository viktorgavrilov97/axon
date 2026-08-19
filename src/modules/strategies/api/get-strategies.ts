"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { getUserStrategies, getActiveStrategies, getStrategyById } from "../lib/strategies-service";

export async function getStrategiesAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized", strategies: [] };
    }

    const strategies = await getUserStrategies(user.id);
    return {
      success: true,
      strategies: strategies.map((s) => ({
        id: s.id,
        configId: s.configId, // Add configId to identify which config was used
        strategyName: s.strategyName, // Strategy name from config
        amount: Number(s.amount),
        durationDays: s.durationDays,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        minPercent: Number(s.minPercent),
        maxPercent: Number(s.maxPercent),
        appliedMultiplier: s.appliedMultiplier ? Number(s.appliedMultiplier) : null,
        createdAt: s.createdAt,
        profits: s.profits.map((p) => ({
          id: p.id,
          date: p.date,
          percent: Number(p.percent),
          amount: Number(p.amount),
          type: p.type,
        })),
        principalReturns: s.principalReturns.map((pr) => ({
          id: pr.id,
          amount: Number(pr.amount),
          createdAt: pr.createdAt,
        })),
      })),
    };
  } catch (error) {
    console.error("Error getting strategies:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get strategies",
      strategies: [],
    };
  }
}

export async function getActiveStrategiesAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized", strategies: [] };
    }

    const strategies = await getActiveStrategies(user.id);
    return {
      success: true,
      strategies: strategies.map((s) => ({
        id: s.id,
        type: s.type,
        amount: Number(s.amount),
        durationDays: s.durationDays,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        minPercent: Number(s.minPercent),
        maxPercent: Number(s.maxPercent),
        appliedMultiplier: s.appliedMultiplier ? Number(s.appliedMultiplier) : null,
        createdAt: s.createdAt,
        profits: s.profits.map((p) => ({
          id: p.id,
          date: p.date,
          percent: Number(p.percent),
          amount: Number(p.amount),
          type: p.type,
        })),
      })),
    };
  } catch (error) {
    console.error("Error getting active strategies:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get active strategies",
      strategies: [],
    };
  }
}

export async function getStrategyByIdAction(strategyId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized", strategy: null };
    }

    const strategy = await getStrategyById(strategyId, user.id);
    if (!strategy) {
      return { success: false, error: "Strategy not found", strategy: null };
    }

    return {
      success: true,
      strategy: {
        id: strategy.id,
        strategyName: strategy.strategyName, // Strategy name from config
        amount: Number(strategy.amount),
        durationDays: strategy.durationDays,
        startDate: strategy.startDate,
        endDate: strategy.endDate,
        status: strategy.status,
        minPercent: Number(strategy.minPercent),
        maxPercent: Number(strategy.maxPercent),
        appliedMultiplier: strategy.appliedMultiplier ? Number(strategy.appliedMultiplier) : null,
        createdAt: strategy.createdAt,
        profits: strategy.profits.map((p) => ({
          id: p.id,
          date: p.date,
          percent: Number(p.percent),
          amount: Number(p.amount),
          type: p.type,
        })),
        principalReturns: strategy.principalReturns.map((pr) => ({
          id: pr.id,
          amount: Number(pr.amount),
          createdAt: pr.createdAt,
        })),
      },
    };
  } catch (error) {
    console.error("Error getting strategy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get strategy",
      strategy: null,
    };
  }
}

