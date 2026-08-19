import { db } from "@/shared/lib/db";
import { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword, validatePassword } from "./password";
import { generateOtpCode, createOtpCode } from "./otp";

export interface RegisterUserParams {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterUserResult {
  user: {
    id: string;
    email: string;
    role: string;
    emailVerified: boolean;
  };
  otpCode: string;
}

export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Email ${email} уже зарегистрирован`);
    this.name = "EmailAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Неверный email или пароль");
    this.name = "InvalidCredentialsError";
  }
}

export class TwoFactorRequiredError extends Error {
  constructor() {
    super("Требуется двухфакторная аутентификация");
    this.name = "TwoFactorRequiredError";
  }
}

export class InvalidOtpError extends Error {
  constructor() {
    super("Неверный код подтверждения");
    this.name = "InvalidOtpError";
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  params: RegisterUserParams
): Promise<RegisterUserResult> {
  const { email, password, name } = params;

  // Validate password
  const passwordValidation = validatePassword(password, email);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors[0] || "Неверный пароль");
  }

  // Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new EmailAlreadyExistsError(email);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name: name || null,
      role: "USER", // Default role
      emailVerified: null,
    },
  });

  // Generate OTP for email verification
  const otpCode = generateOtpCode();
  await createOtpCode(user.email, "EMAIL_VERIFICATION", user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: !!user.emailVerified,
    },
    otpCode,
  };
}

export interface LoginUserParams {
  email: string;
  password: string;
  otpCode?: string;
}

export interface LoginUserResult {
  user: {
    id: string;
    email: string;
    role: string;
  };
  requiresTwoFactor: boolean;
}

/**
 * Login user with email and password
 */
export async function loginUser(
  params: LoginUserParams
): Promise<LoginUserResult> {
  const { email, password, otpCode } = params;

  // Find user
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new InvalidCredentialsError();
  }

  // Check if user has password (not Google-only account)
  if (!user.passwordHash) {
    throw new InvalidCredentialsError();
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new InvalidCredentialsError();
  }

  // Check if 2FA is enabled
  if (user.isTwoFactorEnabled) {
    if (!otpCode) {
      // Generate and return 2FA OTP requirement
      await createOtpCode(user.email, "TWO_FACTOR", user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        requiresTwoFactor: true,
      };
    }

    // Verify 2FA OTP
    const otpValid = await db.otpCode.findFirst({
      where: {
        userId: user.id,
        email: user.email,
        code: otpCode,
        type: "TWO_FACTOR",
        consumed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otpValid) {
      throw new InvalidOtpError();
    }

    // Mark OTP as consumed
    await db.otpCode.update({
      where: { id: otpValid.id },
      data: { consumed: true },
    });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    requiresTwoFactor: false,
  };
}

