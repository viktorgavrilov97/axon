"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import Script from "next/script";

interface TelegramLoginButtonProps {
  disabled?: boolean;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: number;
      hash: string;
    }) => void;
  }
}

export function TelegramLoginButton({ disabled }: TelegramLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Get bot username from environment (client-side)
    const fetchBotUsername = async () => {
      try {
        const response = await fetch("/api/telegram/bot-username");
        if (response.ok) {
          const data = await response.json();
          setBotUsername(data.username || null);
        }
      } catch (error) {
        console.error("[Telegram] Failed to fetch bot username:", error);
      }
    };
    fetchBotUsername();
  }, []);

  useEffect(() => {
    // Set up global callback for Telegram auth
    window.onTelegramAuth = async (user) => {
      setIsLoading(true);
      try {
        console.log("[Telegram] Auth data received:", user);

        // Send auth data to our API
        const response = await fetch("/api/telegram/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: user.id.toString(),
            first_name: user.first_name,
            last_name: user.last_name || "",
            username: user.username || "",
            photo_url: user.photo_url || "",
            auth_date: user.auth_date.toString(),
            hash: user.hash,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to login with Telegram");
        }

        // Create session using Server Action
        const { loginTelegramAction } = await import("@/modules/telegram/api/login-telegram");
        const sessionResult = await loginTelegramAction(data.email);

        if (sessionResult?.error) {
          throw new Error(sessionResult.error);
        }

        // Success - redirect to dashboard
        const ref = searchParams.get("ref");
        const redirectUrl = sessionResult.redirectUrl || (ref ? `/?ref=${ref}` : "/");
        router.push(redirectUrl);
        router.refresh();
      } catch (error) {
        console.error("[Telegram] Login error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to login with Telegram"
        );
      } finally {
        setIsLoading(false);
      }
    };

    return () => {
      // Cleanup
      window.onTelegramAuth = undefined;
    };
  }, [router, searchParams]);

  // Load Telegram widget script and create widget
  useEffect(() => {
    if (!botUsername || !widgetContainerRef.current || scriptLoadedRef.current) {
      return;
    }

    // Check if script is already loaded
    if (document.querySelector('script[src*="telegram-widget"]')) {
      scriptLoadedRef.current = true;
      createWidget();
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      createWidget();
    };
    document.body.appendChild(script);

    function createWidget() {
      if (!widgetContainerRef.current || !botUsername) return;

      // Clear container
      widgetContainerRef.current.innerHTML = "";

      // Create widget script element
      const widgetScript = document.createElement("script");
      widgetScript.async = true;
      widgetScript.src = "https://telegram.org/js/telegram-widget.js?22";
      widgetScript.setAttribute("data-telegram-login", botUsername);
      widgetScript.setAttribute("data-size", "large");
      widgetScript.setAttribute("data-onauth", "onTelegramAuth(user)");
      widgetScript.setAttribute("data-request-access", "write");
      // Optional: specify auth URL (defaults to current domain)
      // widgetScript.setAttribute("data-auth-url", window.location.origin);

      widgetContainerRef.current.appendChild(widgetScript);
    }

    return () => {
      // Cleanup on unmount
      if (widgetContainerRef.current) {
        widgetContainerRef.current.innerHTML = "";
      }
    };
  }, [botUsername]);

  if (!botUsername) {
    return (
      <Button
        variant="secondary"
        disabled={true}
        className="w-full"
      >
        <PaperPlaneTilt size={14} weight="regular" />
        Sign in with Telegram
      </Button>
    );
  }

  return (
    <div
      ref={widgetContainerRef}
      className="flex justify-center w-full"
      style={{ minHeight: "40px" }}
    />
  );
}

