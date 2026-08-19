"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import {
  changePasswordSchema,
  changeEmailSchema,
  phoneSchema,
} from "@/shared/lib/validations";
import { validatePassword, hashPassword, verifyPassword } from "../lib/password";
import { createOtpCode, sendOtpEmail, verifyOtpCode } from "../lib";
import { signOut } from "../lib/auth";

export async function changePasswordAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if user has Google account
  const googleAccount = await db.account.findFirst({
    where: {
      userId: user.id,
      provider: "google",
    },
  });

  if (googleAccount) {
    return { error: "Password change is not available for Google OAuth accounts" };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const validatedFields = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || "Validation failed",
    };
  }

  if (!user.passwordHash) {
    return { error: "Password not set" };
  }

  // Verify current password
  const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isPasswordValid) {
    return { error: "Current password is incorrect" };
  }

  // Full password validation (including blacklist check)
  const passwordValidation = validatePassword(newPassword, user.email || undefined, user.name || undefined);
  if (!passwordValidation.valid) {
    return {
      error: passwordValidation.errors[0] || "Password does not meet security requirements",
    };
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // Invalidate all sessions by deleting all Session records for this user
  await db.session.deleteMany({
    where: { userId: user.id },
  });

  // Send email notification
  try {
    const { sendPasswordChangeNotification } = await import("../lib/email");
    await sendPasswordChangeNotification(user.email);
  } catch (emailError) {
    console.error("Failed to send password change notification:", emailError);
    // Don't fail the password change if email fails
  }

  return { success: true };
}

export async function changeEmailAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if user has Google account
  const googleAccount = await db.account.findFirst({
    where: {
      userId: user.id,
      provider: "google",
    },
  });

  if (googleAccount) {
    return { error: "Email change is not available for Google OAuth accounts" };
  }

  const newEmail = formData.get("newEmail") as string;

  const validatedFields = changeEmailSchema.safeParse({ newEmail });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || "Invalid email",
    };
  }

  const existingUser = await db.user.findUnique({
    where: { email: newEmail },
  });

  if (existingUser) {
    return { error: "Email already in use" };
  }

  const code = await createOtpCode(newEmail, "EMAIL_VERIFICATION", user.id);
  
  try {
  await sendOtpEmail(newEmail, code, "EMAIL_VERIFICATION");
  } catch (emailError) {
    console.error("Failed to send email verification code:", emailError);
    return {
      error: "Не удалось отправить код подтверждения. Пожалуйста, проверьте настройки email или попробуйте позже.",
    };
  }

  return {
    success: true,
    requiresVerification: true,
    message: "Verification code sent to new email",
    email: newEmail,
  };
}

export async function verifyEmailChangeAction(
  newEmail: string,
  code: string
) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if user has Google account
  const googleAccount = await db.account.findFirst({
    where: {
      userId: user.id,
      provider: "google",
    },
  });

  if (googleAccount) {
    return { error: "Email change is not available for Google OAuth accounts" };
  }

  const result = await verifyOtpCode(newEmail, code, "EMAIL_VERIFICATION");

  if (!result.valid) {
    return { error: "Invalid or expired code" };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      email: newEmail,
      emailVerified: new Date(),
    },
  });

  return { success: true };
}

export async function updatePhoneAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const phone = formData.get("phone") as string;

  if (phone) {
    const validatedFields = phoneSchema.safeParse(phone);

    if (!validatedFields.success) {
      return {
        error: validatedFields.error.issues[0]?.message || "Invalid phone",
      };
    }

    const existingUser = await db.user.findUnique({
      where: { phone },
    });

    if (existingUser && existingUser.id !== user.id) {
      return { error: "Phone number already in use" };
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { phone: phone || null },
  });

  return { success: true };
}

export async function toggleTwoFactorAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if user has Google account
  const googleAccount = await db.account.findFirst({
    where: {
      userId: user.id,
      provider: "google",
    },
  });

  const enable = formData.get("enable") === "true";

  if (enable) {
    // Block enabling 2FA for Google accounts
    if (googleAccount) {
      return { error: "2FA is not available for Google OAuth accounts" };
    }

    // Send test OTP
    if (!user.email) {
      return { error: "Email is required for 2FA" };
    }

    const code = await createOtpCode(user.email, "TWO_FACTOR", user.id);
    
    try {
    await sendOtpEmail(user.email, code, "TWO_FACTOR");
    } catch (emailError) {
      console.error("Failed to send 2FA OTP email:", emailError);
      return {
        error: "Не удалось отправить код подтверждения. Пожалуйста, проверьте настройки email или попробуйте позже.",
      };
    }

    return {
      success: true,
      requiresVerification: true,
      message: "Verification code sent to your email",
    };
  } else {
    // Allow disabling 2FA even for Google accounts (in case it was enabled before)
    await db.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: false },
    });

    return { success: true };
  }
}

export async function verifyTwoFactorAction(code: string) {
  const user = await getCurrentUser();

  if (!user || !user.email) {
    return { error: "Unauthorized" };
  }

  // Check if user has Google account
  const googleAccount = await db.account.findFirst({
    where: {
      userId: user.id,
      provider: "google",
    },
  });

  // Block enabling 2FA for Google accounts
  if (googleAccount) {
    return { error: "2FA is not available for Google OAuth accounts" };
  }

  const result = await verifyOtpCode(user.email, code, "TWO_FACTOR");

  if (!result.valid) {
    return { error: "Invalid or expired code" };
  }

  await db.user.update({
    where: { id: user.id },
    data: { isTwoFactorEnabled: true },
  });

  return { 
    success: true,
    message: "2FA enabled successfully",
  };
}

