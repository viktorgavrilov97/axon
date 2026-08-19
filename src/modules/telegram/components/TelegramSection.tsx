"use client";

import { useState, useTransition } from "react";
import { PaperPlaneTilt, X } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import toast from "react-hot-toast";
import {
  toggleTelegramNotificationsAction,
} from "../api/toggle-notifications";
import { disconnectTelegramAction } from "../api/disconnect";

interface TelegramSectionProps {
  isEnabled: boolean;
  telegramChatId: string | null;
  telegramUsername: string | null;
  telegramNotificationsEnabled: boolean;
  onUpdate?: () => void;
}

export function TelegramSection({
  isEnabled,
  telegramChatId,
  telegramUsername,
  telegramNotificationsEnabled,
  onUpdate,
}: TelegramSectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isToggling, startToggling] = useTransition();
  const [isDisconnecting, startDisconnecting] = useTransition();

  // If module is disabled globally
  if (!isEnabled) {
    return (
      <div className="rounded-xl border border-onsurface-800 p-4">
        <p className="text-small text-white-600">
          Telegram integration is currently unavailable.
        </p>
      </div>
    );
  }

  // If Telegram is not connected
  if (!telegramChatId) {
    const handleConnect = async () => {
      setIsConnecting(true);
      try {
        const response = await fetch("/api/telegram/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        // Check content type before parsing JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // If not JSON, it's probably an HTML error page (redirect or error)
          const text = await response.text();
          console.error("[Telegram] Non-JSON response:", text.substring(0, 200));
          
          if (response.status === 401 || response.status === 403) {
            throw new Error("Please log in to connect Telegram");
          }
          throw new Error("Unexpected response from server. Please try again.");
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to generate link");
        }

        const { url } = data;
        if (!url) {
          throw new Error("Invalid response from server");
        }

        // Log the URL for debugging
        console.log("[Telegram] Opening deep-link URL:", url);
        
        // Verify URL format
        if (!url.includes("?start=link_")) {
          console.error("[Telegram] Invalid URL format - missing start parameter:", url);
          throw new Error("Invalid link format from server");
        }

        // Open Telegram in new tab
        window.open(url, "_blank");
        toast.success("Opening Telegram... Click 'Start' in the bot to connect.");
      } catch (error) {
        console.error("[Telegram] Connect error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to connect Telegram"
        );
      } finally {
        setIsConnecting(false);
      }
    };

    return (
      <div className="rounded-xl border border-onsurface-800 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <PaperPlaneTilt
            size={20}
            weight="regular"
            className="text-white-700"
          />
          <h2 className="text-sm">Telegram</h2>
        </div>
        <p className="text-small text-white-600">
          Connect Telegram to receive real-time notifications about your
          operations.
        </p>
        <Button
          variant="secondary"
          onClick={handleConnect}
          disabled={isConnecting}
          isLoading={isConnecting}
        >
          Connect Telegram
        </Button>
      </div>
    );
  }

  // Telegram is connected
  const handleToggleNotifications = async (enabled: boolean) => {
    startToggling(async () => {
      const result = await toggleTelegramNotificationsAction(enabled);
      if (result.ok) {
        toast.success(
          enabled
            ? "Telegram notifications enabled"
            : "Telegram notifications disabled"
        );
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to update notifications");
      }
    });
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Telegram?")) {
      return;
    }

    startDisconnecting(async () => {
      const result = await disconnectTelegramAction();
      if (result.ok) {
        toast.success("Telegram disconnected");
        onUpdate?.();
      } else {
        toast.error(result.error || "Failed to disconnect");
      }
    });
  };

  return (
    <div className="rounded-xl border border-onsurface-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PaperPlaneTilt
            size={20}
            weight="regular"
            className="text-mint"
          />
          <h2 className="text-sm">Telegram</h2>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-mint/20 text-mint">
          Connected
        </span>
      </div>

      {telegramUsername && (
        <p className="text-small text-white-600">
          @{telegramUsername}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">Receive notifications in Telegram</p>
          <p className="text-xs text-white-600">
            Get real-time updates about your operations
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={telegramNotificationsEnabled}
            onChange={(e) => handleToggleNotifications(e.target.checked)}
            disabled={isToggling}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-onsurface-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint"></div>
        </label>
      </div>

      <Button
        variant="ghost"
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        isLoading={isDisconnecting}
        className="w-full"
      >
        <X size={16} weight="regular" className="mr-2" />
        Disconnect
      </Button>
    </div>
  );
}

