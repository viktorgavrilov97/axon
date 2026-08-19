import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email address.");

/**
 * Password validation schema
 * 
 * Requirements:
 * - Minimum length: 8 characters
 * - Maximum length: 72 characters (bcrypt limitation)
 * - Must contain uppercase letters (A-Z)
 * - Must contain lowercase letters (a-z)
 * - Must contain at least one special character (!@#$%^&*()-_=+[]{};:,<.>/?\|)
 * - Allowed characters: a-z, A-Z, 0-9, !@#$%^&*()-_=+[]{};:,<.>/?\|
 * 
 * Note: Full validation (blacklist, email match) happens in password.ts module
 */
export const passwordSchema = z
  .string()
  .min(8, "Password is too short. Minimum 8 characters.")
  .max(72, "Password must be no more than 72 characters")
  .regex(
    /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{};:,<.>/?\\|]+$/,
    "Password contains invalid characters. Only letters, numbers and special characters (!@#$%^&*()-_=+[]{};:,<.>/?\\|) are allowed"
  )
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[!@#$%^&*()\-_=+\[\]{};:,<.>/?\\|]/, "Add a special character.");

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter password"),
});

// Step 1: Request password reset (email only)
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

// Step 2: Reset password with code
export const resetPasswordWithCodeSchema = z
  .object({
    code: z.string().length(6, "Code must contain 6 digits"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// Union schema for server-side validation
export const resetPasswordSchema = requestPasswordResetSchema.or(resetPasswordWithCodeSchema);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const changeEmailSchema = z.object({
  newEmail: emailSchema,
});

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .optional()
  .or(z.literal(""));

export const otpCodeSchema = z.string().length(6, "Code must contain 6 digits");

