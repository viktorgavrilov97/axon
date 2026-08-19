"use server";

import { db } from "@/shared/lib/db";
import { passwordSchema } from "@/shared/lib/validations";
import { z } from "zod";
import {
  verifyPasswordResetToken,
} from "../lib/password-reset-token";
import { validatePassword, hashPassword } from "../lib/password";
import { sendPasswordChangeNotification } from "../lib/email";

/**
 * Reset password using token from email link
 */
export async function resetPasswordWithTokenAction(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) {
    return { error: "Токен не предоставлен" };
  }

  // Validate password fields (token-based reset doesn't need code)
  const resetPasswordSchema = z.object({
    password: passwordSchema,
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают.",
    path: ["confirmPassword"],
  });

  const validatedFields = resetPasswordSchema.safeParse({
    password,
    confirmPassword,
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || "Ошибка валидации",
    };
  }

  if (password !== confirmPassword) {
    return { error: "Пароли не совпадают." };
  }

  try {
    // Verify token
    const tokenResult = await verifyPasswordResetToken(token);

    if (!tokenResult.valid || !tokenResult.userId) {
      return { error: "Ссылка недействительна или истекла" };
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: tokenResult.userId },
    });

    if (!user) {
      return { error: "Пользователь не найден" };
    }

    // Full password validation (including blacklist check)
    const passwordValidation = validatePassword(
      password,
      user.email || undefined,
      user.name || undefined
    );
    if (!passwordValidation.valid) {
      return {
        error:
          passwordValidation.errors[0] ||
          "Пароль не соответствует требованиям безопасности",
      };
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all sessions
    await db.session.deleteMany({
      where: { userId: user.id },
    });

    // Send notification email
    try {
      await sendPasswordChangeNotification(user.email);
    } catch (emailError) {
      console.error("Failed to send password change notification:", emailError);
      // Don't fail the reset if email fails
    }

    return {
      success: true,
      redirectUrl: "/auth/email?resetSuccess=true",
    };
  } catch (error) {
    console.error("Reset password error:", error);
    return { error: "Не удалось сбросить пароль. Попробуйте ещё раз." };
  }
}

/**
 * Verify if a reset token is valid (for checking on page load)
 * Does not consume the token - only checks validity
 */
export async function verifyResetTokenAction(token: string) {
  if (!token) {
    return { valid: false, error: "Токен не предоставлен" };
  }

  try {
    const result = await verifyPasswordResetToken(token, false); // Don't consume on verification
    
    if (!result.valid) {
      return { valid: false, error: "Ссылка недействительна или истекла" };
    }

    return { valid: true };
  } catch (error) {
    console.error("Verify token error:", error);
    return { valid: false, error: "Ошибка при проверке токена" };
  }
}

