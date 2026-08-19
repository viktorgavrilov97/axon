"use server";

import { db } from "@/shared/lib/db";
import { verifyOtpCode } from "../lib/otp";
import { parseOtpType } from "../lib/otp-utils";
import { signIn } from "../lib/auth";
import { OtpType } from "@prisma/client";
import { rateLimitOTP } from "@/shared/lib/rate-limit-redis";

export async function verifyOtpAction(
  email: string,
  code: string,
  type: OtpType | string
) {
  // Rate limiting
  const rateLimitResult = await rateLimitOTP(email);
  if (!rateLimitResult.success) {
    // Upstash returns reset in milliseconds, convert to seconds for calculation
    const resetSeconds = Math.floor(rateLimitResult.reset / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const minutesUntilReset = Math.ceil((resetSeconds - nowSeconds) / 60);
    const errorMessage = minutesUntilReset > 0 
      ? `Слишком много попыток. Попробуйте через ${minutesUntilReset} ${minutesUntilReset === 1 ? 'минуту' : minutesUntilReset < 5 ? 'минуты' : 'минут'}.`
      : "Слишком много попыток. Попробуйте позже.";
    return {
      error: errorMessage,
    };
  }

  // Ensure type is proper enum value
  const otpType = typeof type === "string" ? parseOtpType(type) : type;
  const result = await verifyOtpCode(email, code, otpType);

  if (!result.valid) {
    return { error: "Invalid or expired code" };
  }

  try {
    if (otpType === "EMAIL_VERIFICATION") {
      if (!result.userId) {
        return { error: "User not found" };
      }

      await db.user.update({
        where: { id: result.userId },
        data: { emailVerified: new Date() },
      });

      const user = await db.user.findUnique({
        where: { id: result.userId },
      });

      if (!user) {
        return { error: "User not found" };
      }

      // After email verification, create session and redirect to wallet
      await signIn("credentials", {
        email: user.email,
        password: "auto_login_after_verification",
        redirect: false,
      });

      return {
        success: true,
        redirectUrl: "/terminal",
      };
    } else if (otpType === "TWO_FACTOR") {
      if (!result.userId) {
        return { error: "User not found" };
      }

      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("2fa_token");

      if (!token) {
        return { error: "Session expired. Please login again." };
      }

      const user = await db.user.findUnique({
        where: { id: result.userId },
      });

      if (!user) {
        return { error: "User not found" };
      }

      // Verify 2FA token
      const tokenValue = token.value;
      const decoded = Buffer.from(tokenValue, "base64").toString("utf-8");
      const [tokenEmail] = decoded.split(":");

      if (tokenEmail !== email) {
        return { error: "Invalid session" };
      }

      // Clear 2FA token
      cookieStore.delete("2fa_token");

      // Create session using special marker
      await signIn("credentials", {
        email: user.email,
        password: "2fa_verified",
        redirect: false,
      });

      return {
        success: true,
        redirectUrl: "/terminal",
      };
    } else if (otpType === "PASSWORD_RESET") {
      return {
        success: true,
        redirectUrl: `/reset-password?code=${code}&email=${encodeURIComponent(email)}`,
      };
    }

    return { error: "Invalid OTP type" };
  } catch (error) {
    console.error("Verify OTP error:", error);
    return { error: "Failed to verify code" };
  }
}

export async function resendOtpAction(email: string, type: OtpType | string) {
  const { createOtpCode, sendOtpEmail, canResendOtp, parseOtpType } = await import(
    "../lib"
  );

  // Ensure type is proper enum value
  const otpType = typeof type === "string" ? parseOtpType(type) : type;
  const canResend = await canResendOtp(email, otpType);

  if (!canResend) {
    return { error: "Please wait before requesting a new code" };
  }

  const user = await db.user.findUnique({
    where: { email },
  });

  const code = await createOtpCode(email, otpType, user?.id);
  
  try {
  await sendOtpEmail(email, code, otpType);
  } catch (emailError) {
    console.error("Failed to resend OTP email:", emailError);
    return {
      error: "Не удалось отправить код. Пожалуйста, проверьте настройки email или попробуйте позже.",
    };
  }

  return { success: true };
}

