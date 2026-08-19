"use server";

import { db } from "@/shared/lib/db";
import { requestPasswordResetSchema } from "@/shared/lib/validations";
import {
  createPasswordResetToken,
  canRequestPasswordReset,
} from "../lib/password-reset-token";
import { sendPasswordResetEmail } from "../lib/email";
import { rateLimitPasswordReset } from "@/shared/lib/rate-limit-redis";

/**
 * Request password reset via email link
 * 
 * Security features:
 * - Rate limiting (3 requests per hour)
 * - Token hashing before storage
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = formData.get("email") as string;

  const validatedFields = requestPasswordResetSchema.safeParse({ email });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0]?.message || "Введите корректный e-mail.",
    };
  }

  const { email: validEmail } = validatedFields.data;

  // Rate limiting
  const rateLimitResult = await rateLimitPasswordReset(validEmail);
  if (!rateLimitResult.success) {
    // Upstash returns reset in milliseconds, convert to seconds for calculation
    const resetSeconds = Math.floor(rateLimitResult.reset / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const minutesUntilReset = Math.ceil((resetSeconds - nowSeconds) / 60);
    const errorMessage = minutesUntilReset > 0 
      ? `Слишком много запросов. Попробуйте через ${minutesUntilReset} ${minutesUntilReset === 1 ? 'минуту' : minutesUntilReset < 5 ? 'минуты' : 'минут'}.`
      : "Слишком много запросов. Попробуйте позже.";
    return {
      error: errorMessage,
    };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: validEmail },
    });

    // Show error if user doesn't exist
    if (!user) {
      return {
        error: "Пользователь с таким e-mail не найден.",
      };
    }

    // Additional rate limiting check (from password-reset-token)
    const canRequest = await canRequestPasswordReset(validEmail);
    if (!canRequest) {
      return {
        error: "Слишком много запросов. Попробуйте позже.",
      };
    }

    // Generate and save token
    const token = await createPasswordResetToken(user.id);

    // Send email with reset link
    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      return {
        error: "Не удалось отправить письмо. Попробуйте позже.",
      };
    }

    // Return success with email
    return {
      success: true,
      email: validEmail,
    };
  } catch (error) {
    console.error("Request password reset error:", error);
    return {
      error: "Что-то пошло не так. Попробуйте ещё раз.",
    };
  }
}
