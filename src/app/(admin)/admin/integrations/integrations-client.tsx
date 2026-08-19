"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { getFeatureFlagsAction } from "@/modules/admin/api/get-feature-flags";
import { toggleFeatureFlagAction } from "@/modules/admin/api/toggle-feature-flag";

export function IntegrationsClient() {
  const [flags, setFlags] = useState<Array<{ key: string; enabled: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, startToggling] = useTransition();

  const loadFlags = async () => {
    setIsLoading(true);
    try {
      const result = await getFeatureFlagsAction();
      if (result.success && result.flags) {
        setFlags(result.flags);
      } else {
        toast.error(result.error || "Failed to load feature flags");
      }
    } catch (error) {
      console.error("[Integrations] Error loading flags:", error);
      toast.error("Failed to load feature flags");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const handleToggle = async (key: string, currentEnabled: boolean) => {
    startToggling(async () => {
      const result = await toggleFeatureFlagAction(key, !currentEnabled);
      if (result.success) {
        toast.success(
          `Telegram integration ${!currentEnabled ? "enabled" : "disabled"}`
        );
        await loadFlags();
      } else {
        toast.error(result.error || "Failed to toggle feature flag");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const telegramFlag = flags.find((f) => f.key === "telegram_integration");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-onsurface-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <PaperPlaneTilt size={24} weight="regular" className="text-white-700" />
          <div className="flex-1">
            <h2 className="text-lg font-medium text-white-900">Telegram Integration</h2>
            <p className="text-sm text-white-600 mt-1">
              Enable Telegram login and notifications module. When disabled, all Telegram UI is hidden and no messages are sent.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white-600">
              {telegramFlag?.enabled ? "Enabled" : "Disabled"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telegramFlag?.enabled ?? false}
                onChange={() =>
                  handleToggle("telegram_integration", telegramFlag?.enabled ?? false)
                }
                disabled={isToggling}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-onsurface-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

