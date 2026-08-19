"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { verifyOtpAction, resendOtpAction } from "@/modules/identity/api/verify-otp";
import { parseOtpType } from "@/modules/identity/lib/otp-utils";
import { Button } from "@/shared/ui/button";
import { AuthContainer, authFormGap, authButtonsGap } from "@/shared/ui/auth/container";
import { OtpInput } from "@/shared/ui/otp-input";
import { OtpType } from "@prisma/client";

function VerifyOtpPageForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const type = parseOtpType(searchParams.get("type"));

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const verifiedCodeRef = useRef<string>("");

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const verifyCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || isLoading || verifiedCodeRef.current === codeToVerify) {
      return;
    }

    verifiedCodeRef.current = codeToVerify;
    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyOtpAction(email, codeToVerify, type);

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        // НЕ сбрасываем verifiedCodeRef, чтобы не проверять тот же код повторно
      } else if (result?.success && result?.redirectUrl) {
        // Redirect on client side
        window.location.href = result.redirectUrl;
      } else {
          setError("An unexpected error occurred");
        setIsLoading(false);
          // НЕ сбрасываем verifiedCodeRef, чтобы не проверять тот же код повторно
      }
    } catch (error) {
      console.error("Verify OTP form error:", error);
        setError("Failed to verify code. Please try again.");
      setIsLoading(false);
      // НЕ сбрасываем verifiedCodeRef, чтобы не проверять тот же код повторно
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // При ручной отправке сбрасываем проверенный код, чтобы можно было повторить
    if (verifiedCodeRef.current === code && error) {
      verifiedCodeRef.current = "";
    }
    await verifyCode(code);
  };

  // Сброс проверенного кода и ошибки при изменении ввода (когда пользователь меняет символы)
  useEffect(() => {
    // Сбрасываем только если код изменился (не равен проверенному)
    if (code !== verifiedCodeRef.current) {
      verifiedCodeRef.current = "";
      setError(null); // Сбрасываем ошибку при изменении кода
    }
  }, [code]);

  // Автопроверка при вводе всех 6 символов
  useEffect(() => {
    // Проверяем только если код полный, не идет загрузка, и код еще не проверялся
    if (code.length === 6 && !isLoading && verifiedCodeRef.current === "") {
      verifyCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isLoading]);

  const handleResend = async () => {
    setCanResend(false);
    setResendTimer(60);
    setError(null);

    const result = await resendOtpAction(email, type);

    if (result?.error) {
      setError(result.error);
    }
  };

  const getTitle = () => {
    switch (type) {
      case "EMAIL_VERIFICATION":
        return "Verify your email";
      case "PASSWORD_RESET":
        return "Verify reset code";
      case "TWO_FACTOR":
        return "Two-factor authentication";
      default:
        return "Verify code";
    }
  };

  return (
    <AuthContainer 
      title={getTitle()}
      description={<>Enter the 6-digit code <br />sent to {email}</>}
    >

      <form onSubmit={handleSubmit} className={`flex flex-col ${authFormGap}`}>
        <OtpInput
            value={code}
          onChange={setCode}
          error={error || undefined}
          />

          <Button type="submit" isLoading={isLoading} className="w-full">
          Verify
          </Button>
        </form>

      <div className={`text-left ${authButtonsGap}`}>
          {canResend ? (
            <Button variant="ghost" onClick={handleResend} className="w-full">
            Resend code
            </Button>
          ) : (
            <p className="text-small text-white-600">
            Resend code in {resendTimer}s
            </p>
          )}
      </div>
    </AuthContainer>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <AuthContainer>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthContainer>
    }>
      <VerifyOtpPageForm />
    </Suspense>
  );
}

