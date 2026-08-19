"use server";

import { db } from "@/shared/lib/db";
import { emailSchema } from "@/shared/lib/validations";

/**
 * Check email status for email-first authentication flow
 * Returns information about whether user exists, has password, or is Google-only
 */
export async function checkEmailAction(email: string) {
  try {
    // Validate email format
    const validatedEmail = emailSchema.safeParse(email);
    if (!validatedEmail.success) {
      return {
        error: "Введите корректный e-mail.",
      };
    }

    const user = await db.user.findUnique({
      where: { email: validatedEmail.data },
      include: {
        accounts: {
          where: { provider: "google" },
        },
      },
    });

    if (!user) {
      // User doesn't exist - show registration form
      return {
        success: true,
        exists: false,
        hasPassword: false,
        isGoogleOnly: false,
      };
    }

    // Check if user has password
    const hasPassword = !!user.passwordHash;

    // Check if user has Google account
    const hasGoogleAccount = user.accounts.length > 0;

    // Determine if Google-only (has Google account but no password)
    const isGoogleOnly = hasGoogleAccount && !hasPassword;

    return {
      success: true,
      exists: true,
      hasPassword,
      isGoogleOnly,
    };
  } catch (error) {
    console.error("Check email error:", error);
    return {
      error: "Что-то пошло не так. Попробуйте ещё раз.",
    };
  }
}

