"use server";

import { signIn, signOut } from "../lib/auth";
import { db } from "@/shared/lib/db";
import { createOtpCode, sendOtpEmail } from "../lib";
import { verifyPassword } from "../lib/password";
import { cookies } from "next/headers";
import { rateLimitAuth } from "@/shared/lib/rate-limit-redis";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Rate limiting
  const rateLimitResult = await rateLimitAuth(email);
  if (!rateLimitResult.success) {
    // Upstash returns reset in milliseconds, convert to seconds for calculation
    const resetSeconds = Math.floor(rateLimitResult.reset / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const minutesUntilReset = Math.ceil((resetSeconds - nowSeconds) / 60);
    const errorMessage = minutesUntilReset > 0 
      ? `Слишком много попыток входа. Попробуйте через ${minutesUntilReset} ${minutesUntilReset === 1 ? 'минуту' : minutesUntilReset < 5 ? 'минуты' : 'минут'}.`
      : "Слишком много попыток входа. Попробуйте позже.";
    return {
      error: errorMessage,
    };
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !user.emailVerified) {
      return {
        error: "Email не подтверждён. Пожалуйста, подтвердите email.",
      };
    }

    if (!user.passwordHash) {
      return { error: "Неверный пароль. Попробуйте ещё раз." };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return { error: "Неверный пароль. Попробуйте ещё раз." };
    }

    if (user.isTwoFactorEnabled) {
      const code = await createOtpCode(email, "TWO_FACTOR", user.id);
      
      try {
      await sendOtpEmail(email, code, "TWO_FACTOR");
      } catch (emailError) {
        console.error("Failed to send 2FA OTP email:", emailError);
        return {
          error: "Не удалось отправить код подтверждения. Пожалуйста, попробуйте ещё раз.",
        };
      }

      // Store temporary token for 2FA verification
      const tempToken = Buffer.from(`${email}:${Date.now()}`).toString("base64");
      const cookieStore = await cookies();
      cookieStore.set("2fa_token", tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 15, // 15 minutes
      });

      return {
        success: true,
        redirectUrl: `/verify-otp?type=two_factor&email=${encodeURIComponent(email)}`,
      };
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { error: result.error };
    }

    return {
      success: true,
      redirectUrl: "/terminal",
    };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Неверный пароль. Попробуйте ещё раз." };
  }
}

export async function loginWithGoogleAction(referralCode?: string | null) {
  // Save referral code in cookie if provided (for new user registration via Google OAuth)
  if (referralCode) {
    const cookieStore = await cookies();
    cookieStore.set("pending_referral_code", referralCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15, // 15 minutes
      path: "/",
    });
    console.log("[GoogleOAuth] Saved referral code in cookie:", referralCode);
  }
  
  // Important: if user is currently signed in (e.g. via credentials) and tries to start Google OAuth,
  // Auth.js may treat this as an account-link attempt and throw OAuthAccountNotLinked
  // (even if the Google account belongs to the same email/user in a shared DB setup).
  // Start OAuth from a clean session.
  await signOut({ redirect: false });

  // Google OAuth will check 2FA in the signIn callback
  // If 2FA is required, it will set cookies and return false
  // The user will be redirected to check-2fa page which redirects to verify-otp
  await signIn("google", { redirectTo: "/terminal" });
}

