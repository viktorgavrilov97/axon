"use server";

import { db } from "@/shared/lib/db";
import { registerSchema } from "@/shared/lib/validations";
import { createOtpCode, sendOtpEmail } from "../lib";
import { validatePassword, hashPassword } from "../lib/password";
import { rateLimitAuth } from "@/shared/lib/rate-limit-redis";
import { generateReferralCode } from "@/shared/lib/referral-code";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/shared/lib/auth";

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const referralCode = formData.get("referralCode") as string | null;
  
  console.log("[Register] Referral code from formData:", referralCode);

  // Check if user is already authenticated
  const currentUser = await getCurrentUser();
  if (currentUser) {
    // If user is already logged in, check if they're trying to use their own referral code
    if (referralCode) {
      const userWithCode = await db.user.findUnique({
        where: { id: currentUser.id },
        select: { referralCode: true },
      });
      if (userWithCode?.referralCode === referralCode) {
        return { error: "You cannot use your own referral code" };
      }
    }
  }

  // Rate limiting
  const rateLimitResult = await rateLimitAuth(email);
  if (!rateLimitResult.success) {
    // Upstash returns reset in milliseconds, convert to seconds for calculation
    const resetSeconds = Math.floor(rateLimitResult.reset / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const minutesUntilReset = Math.ceil((resetSeconds - nowSeconds) / 60);
    const errorMessage = minutesUntilReset > 0 
      ? `Слишком много попыток регистрации. Попробуйте через ${minutesUntilReset} ${minutesUntilReset === 1 ? 'минуту' : minutesUntilReset < 5 ? 'минуты' : 'минут'}.`
      : "Слишком много попыток регистрации. Попробуйте позже.";
    return {
      error: errorMessage,
    };
  }

  const validatedFields = registerSchema.safeParse({
    email,
    password,
    confirmPassword,
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || "Ошибка валидации",
    };
  }

  const { email: validEmail, password: validPassword } = validatedFields.data;

  try {
    // Full password validation (including blacklist check)
    const passwordValidation = validatePassword(validPassword, validEmail);
    if (!passwordValidation.valid) {
      return {
        error: passwordValidation.errors[0] || "Пароль не соответствует требованиям безопасности",
      };
    }

    const existingUser = await db.user.findUnique({
      where: { email: validEmail },
    });

    if (existingUser) {
      return { error: "Этот email уже зарегистрирован." };
    }

    const passwordHash = await hashPassword(validPassword);

    // Find referral parent if referral code provided
    let referralParentId: string | undefined;
    if (referralCode) {
      console.log("[Register] Looking for parent with referral code:", referralCode);
      const parentUser = await db.user.findUnique({
        where: { referralCode },
        select: { id: true, email: true },
      });
      if (parentUser) {
        // Prevent self-referral: check if the referral code belongs to the same email
        if (parentUser.email === validEmail) {
          console.log("[Register] User tried to use their own referral code, ignoring");
          // Silently ignore self-referral (don't fail registration, just don't set parent)
        } else {
          referralParentId = parentUser.id;
          console.log("[Register] Found parent user, ID:", referralParentId);
        }
      } else {
        console.log("[Register] Parent user not found for referral code:", referralCode);
      }
      // If referral code not found, silently ignore (don't fail registration)
    } else {
      console.log("[Register] No referral code provided");
    }

    // Generate unique referral code for new user
    let userReferralCode: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      userReferralCode = generateReferralCode();
      attempts++;
      
      // Check if code already exists
      const existing = await db.user.findUnique({
        where: { referralCode: userReferralCode },
        select: { id: true },
      });
      
      if (!existing) {
        break; // Code is unique
      }
      
      if (attempts >= maxAttempts) {
        throw new Error("Failed to generate unique referral code");
      }
    } while (true);

    const user = await db.user.create({
      data: {
        email: validEmail,
        passwordHash,
        referralCode: userReferralCode,
        referralParentId: referralParentId || null,
      },
    });
    
    console.log("[Register] User created with referralParentId:", user.referralParentId);

    // Save referral code in cookie if provided (for onboarding display)
    // This ensures the code is available on onboarding page even if DB relation isn't loaded yet
    if (referralCode) {
      const cookieStore = await cookies();
      cookieStore.set("pending_referral_code", referralCode, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 15, // 15 minutes
        path: "/",
      });
      console.log("[Register] Saved referral code in cookie for onboarding:", referralCode);
    }

    const code = await createOtpCode(validEmail, "EMAIL_VERIFICATION", user.id);
    
    // Try to send email, but don't fail registration if email fails
    try {
      await sendOtpEmail(validEmail, code, "EMAIL_VERIFICATION");
      console.log("OTP email sent successfully");
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      // Continue anyway - user can request resend
    }

    const redirectUrl = `/verify-otp?type=email_verification&email=${encodeURIComponent(validEmail)}`;
    console.log("Registration successful, redirecting to:", redirectUrl);
    
    return {
      success: true,
      redirectUrl,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Не удалось создать аккаунт. Попробуйте ещё раз." };
  }
}

