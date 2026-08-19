"use server";

import { processDailyProfits } from "../lib/strategies-profit-engine";

/**
 * Cron endpoint to run daily profit calculations
 * Should be called by external cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 * 
 * Security: Add API key or secret check in production
 */
export async function runDailyProfitCronAction(): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
}> {
  try {
    // TODO: Add API key validation in production
    // const apiKey = headers().get("x-api-key");
    // if (apiKey !== process.env.CRON_API_KEY) {
    //   return { success: false, processed: 0, errors: ["Unauthorized"] };
    // }

    const result = await processDailyProfits();
    return {
      success: result.errors.length === 0,
      processed: result.processed,
      errors: result.errors,
    };
  } catch (error) {
    console.error("Error running daily profit cron:", error);
    return {
      success: false,
      processed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}


