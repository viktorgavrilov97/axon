"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema } from "@/shared/lib/validations";
import { z } from "zod";
import { checkEmailAction } from "@/modules/identity/api/check-email";
import { loginWithGoogleAction } from "@/modules/identity/api/login";
import { Input } from "@/shared/ui/inputs";
import { Button } from "@/shared/ui/button";
import { AuthContainer, authFormGap } from "@/shared/ui/auth/container";
import { AuthMessage } from "@/shared/ui/auth/message";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { TelegramLoginButton } from "@/modules/telegram/components/TelegramLoginButton";

function EmailPageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  useEffect(() => {
    if (searchParams.get("resetSuccess") === "true") {
      setSuccess("Password successfully updated. You can now log in with your new password.");
    }
    // Check if Telegram is enabled via API route
    const checkTelegram = async () => {
      try {
        const response = await fetch("/api/telegram/check-enabled");
        if (response.ok) {
          const data = await response.json();
          setTelegramEnabled(data.enabled ?? false);
        } else {
          setTelegramEnabled(false);
        }
      } catch (error) {
        console.error("[Telegram] Error checking if enabled:", error);
        setTelegramEnabled(false);
      }
    };
    checkTelegram();
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: emailSchema })),
  });

  const onSubmit = async (data: { email: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await checkEmailAction(data.email);

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result?.success) {
        // Navigate to password step with email and ref (if present) in query params
        const ref = searchParams.get("ref");
        const queryParams = new URLSearchParams({ email: data.email });
        if (ref) {
          queryParams.set("ref", ref);
        }
        router.push(`/auth/password?${queryParams.toString()}`);
      } else {
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Email check error:", error);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const ref = searchParams.get("ref");
    await loginWithGoogleAction(ref);
  };

  return (
    <AuthContainer 
      title="Welcome to Axon Capital"
      description={<>Enter your email address <br />to sign in or create a new account.</>}
    >
      {success && (
        <AuthMessage type="success">
          {success}
        </AuthMessage>
      )}

          <form onSubmit={handleSubmit(onSubmit)} className={`flex flex-col ${authFormGap}`}>
            <Input
              label="Email"
              type="email"
              {...register("email")}
              error={(errors.email?.message as string) || error || undefined}
              floatingLabel={true}
              autoFocus
            />

            <Button type="submit" isLoading={isLoading} variant="primary" className="w-full">
              Continue
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-onsurface-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface-900 text-white-600" style={{ fontSize: '11px' }}>OR</span>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full"
          >
            <IconBrandGoogleFilled size={14} />
            Sign in with Google
          </Button>

          {telegramEnabled && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-onsurface-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-surface-900 text-white-600" style={{ fontSize: '11px' }}>OR</span>
                </div>
              </div>

              <TelegramLoginButton disabled={isLoading} />
            </>
          )}
    </AuthContainer>
  );
}

export default function EmailPage() {
  return (
    <Suspense fallback={
      <AuthContainer>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthContainer>
    }>
      <EmailPageForm />
    </Suspense>
  );
}

