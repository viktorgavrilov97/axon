"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { runDailyProfitCronAction } from "../api/run-daily-profit-cron";
import { handleServerActionError } from "@/shared/lib/server-action-error-handler";
import toast from "react-hot-toast";

/**
 * AutoProfitProcessor - автоматически запускает процесс начисления процентов каждую минуту
 * Только для тестирования. В production используется Vercel Cron — здесь компонент no-op.
 */
export function AutoProfitProcessor() {
  const router = useRouter();
  const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

  useEffect(() => {
    if (isProd) return;

    const processProfits = async () => {
      try {
        const result = await runDailyProfitCronAction();
        if (result.success && result.processed > 0) {
          console.log(`[AutoProfitProcessor] Processed ${result.processed} profits`);
          // Обновляем UI после начисления
          router.refresh();
        }
      } catch (error) {
        console.error("[AutoProfitProcessor] Error processing profits:", error);
        const errorInfo = handleServerActionError(error);
        if (errorInfo.isPayloadTooLarge) {
          toast.error(errorInfo.message);
        }
      }
    };

    // Запускаем сразу
    processProfits();

    // Затем запускаем каждые 10 секунд для более частой проверки (для тестирования)
    const interval = setInterval(() => {
      processProfits();
    }, 10000); // 10 секунд для тестирования

    return () => {
      clearInterval(interval);
    };
  }, [router, isProd]);

  // Компонент не рендерит ничего видимого
  return null;
}

