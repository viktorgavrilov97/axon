"use server";

import { db } from "@/shared/lib/db";
import { requestPasswordResetSchema, resetPasswordWithCodeSchema } from "@/shared/lib/validations";
import { createOtpCode, sendOtpEmail, verifyOtpCode } from "../lib";
import { validatePassword, hashPassword } from "../lib/password";
import { signIn } from "../lib/auth";

export async function requestPasswordResetAction(formData: FormData) {
  const email = formData.get("email") as string;

  const validatedFields = requestPasswordResetSchema.safeParse({ email });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || "Invalid email",
    };
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: "User not found" };
    }

    const code = await createOtpCode(email, "PASSWORD_RESET", user.id);
    
    try {
    await sendOtpEmail(email, code, "PASSWORD_RESET");
    } catch (emailError) {
      console.error("Failed to send password reset OTP email:", emailError);
      return {
        error: "Не удалось отправить код восстановления. Пожалуйста, проверьте настройки email или попробуйте позже.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Request password reset error:", error);
    return { error: "Failed to send reset code" };
  }
}

export async function resetPasswordAction(formData: FormData) {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const validatedFields = resetPasswordWithCodeSchema.safeParse({
    code,
    password,
    confirmPassword,
  });

  if (!validatedFields.success || !("password" in validatedFields.data)) {
    return {
      error: validatedFields.error?.issues[0]?.message || "Validation failed",
    };
  }

  if (password !== confirmPassword) {
    return { error: "These don't match — try again." };
  }

  try {
    const result = await verifyOtpCode(email, code, "PASSWORD_RESET");

    if (!result.valid) {
      return { error: "Invalid or expired code" };
    }

    if (!result.userId) {
      return { error: "User not found" };
    }

    // Get user for validation
    const user = await db.user.findUnique({
      where: { id: result.userId },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Full password validation (including blacklist check)
    const passwordValidation = validatePassword(password, user.email || undefined, user.name || undefined);
    if (!passwordValidation.valid) {
      return {
        error: passwordValidation.errors[0] || "Password does not meet security requirements",
      };
    }

    const passwordHash = await hashPassword(password);

    await db.user.update({
      where: { id: result.userId },
      data: { passwordHash },
    });

    // Invalidate all sessions
    await db.session.deleteMany({
      where: { userId: result.userId },
    });

    await signIn("credentials", {
      email: user.email,
      password,
      redirect: false,
    });

    return {
      success: true,
      redirectUrl: "/terminal",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "Failed to reset password" };
  }
}

