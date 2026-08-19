"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { runDailyProfitCronAction } from "../api/run-daily-profit-cron";

export function AdminProfitProcessor() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    processed: number;
    errors: string[];
  } | null>(null);

  const handleProcess = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await runDailyProfitCronAction();
      setResult(res);
    } catch (error) {
      setResult({
        success: false,
        processed: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-onsurface-900 p-6 rounded-xl border border-onsurface-950">
      <h2 className="text-heading text-white-900 mb-4">Strategy Profit Processing</h2>
      <p className="text-body text-white-600 mb-4">
        Manually trigger profit calculation and principal return for active strategies.
        In test mode, processes profits every minute instead of daily.
      </p>

      <Button
        onClick={handleProcess}
        disabled={loading}
        className="mb-4"
      >
        {loading ? "Processing..." : "Process Profits & Returns"}
      </Button>

      {result && (
        <div className={`p-4 rounded-xl border ${
          result.success
            ? "bg-mint/10 border-mint/20"
            : "bg-redhaze/10 border-redhaze/20"
        }`}>
          <p className={`text-body font-medium mb-2 ${
            result.success ? "text-mint" : "text-redhaze"
          }`}>
            {result.success ? "✓ Success" : "✗ Error"}
          </p>
          <p className="text-small text-white-600 mb-2">
            Processed: {result.processed} strategies
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-small text-white-600 mb-1">Errors:</p>
              <ul className="list-disc list-inside text-small text-redhaze">
                {result.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


