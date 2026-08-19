import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validatePassword,
  hashPassword,
  verifyPassword,
} from "@/modules/identity/lib/password";
import {
  registerUser,
  loginUser,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidOtpError,
} from "@/modules/identity/lib/auth-service";
import { createMockUser } from "./test-utils";

// Mock database
vi.mock("@/shared/lib/db", () => {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    otpCode: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return { db: mockDb };
});

// Mock OTP module
vi.mock("@/modules/identity/lib/otp", () => ({
  generateOtpCode: () => "123456",
  createOtpCode: vi.fn(),
}));

import { db } from "@/shared/lib/db";

describe("Password Policy", () => {
  it("should reject password shorter than 8 characters", () => {
    const result = validatePassword("Short1!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Пароль слишком короткий. Минимум 8 символов.");
  });

  it("should reject password without uppercase letter", () => {
    const result = validatePassword("lowercase123!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Добавьте заглавную букву.");
  });

  it("should reject password without lowercase letter", () => {
    const result = validatePassword("UPPERCASE123!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Добавьте строчную букву.");
  });

  it("should reject password without special character", () => {
    const result = validatePassword("Password123");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Добавьте специальный символ.");
  });

  it("should accept valid password", () => {
    const result = validatePassword("ValidPass123!");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("User Registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create user with hashed password and USER role by default", async () => {
    const mockUser = createMockUser({
      id: "new-user-id",
      email: "new@example.com",
      role: "USER",
      emailVerified: null,
    });

    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue(mockUser);
    vi.mocked(db.otpCode.create).mockResolvedValue({} as any);

    const result = await registerUser({
      email: "new@example.com",
      password: "ValidPass123!",
    });

    expect(result.user.role).toBe("USER");
    expect(result.user.email).toBe("new@example.com");
    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.com",
        role: "USER",
        emailVerified: null,
        passwordHash: expect.any(String),
      }),
    });
    // Password hash should not be in result
    expect("passwordHash" in result.user).toBe(false);
  });

  it("should throw EmailAlreadyExistsError for duplicate email", async () => {
    const existingUser = createMockUser({ email: "existing@example.com" });

    vi.mocked(db.user.findUnique).mockResolvedValue(existingUser);

    await expect(
      registerUser({
        email: "existing@example.com",
        password: "ValidPass123!",
      })
    ).rejects.toThrow(EmailAlreadyExistsError);
  });
});

describe("User Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should succeed with correct email and password", async () => {
    const mockUser = createMockUser({
      email: "test@example.com",
      passwordHash: await hashPassword("ValidPass123!"),
      isTwoFactorEnabled: false,
    });

    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

    const result = await loginUser({
      email: "test@example.com",
      password: "ValidPass123!",
    });

    expect(result.user.email).toBe("test@example.com");
    expect(result.requiresTwoFactor).toBe(false);
  });

  it("should throw InvalidCredentialsError for wrong password", async () => {
    const mockUser = createMockUser({
      email: "test@example.com",
      passwordHash: await hashPassword("CorrectPass123!"),
    });

    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

    await expect(
      loginUser({
        email: "test@example.com",
        password: "WrongPass123!",
      })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("should throw InvalidCredentialsError for non-existent email", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    await expect(
      loginUser({
        email: "nonexistent@example.com",
        password: "AnyPass123!",
      })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("should require 2FA when enabled and no OTP provided", async () => {
    const mockUser = createMockUser({
      email: "test@example.com",
      passwordHash: await hashPassword("ValidPass123!"),
      isTwoFactorEnabled: true,
    });

    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(db.otpCode.create).mockResolvedValue({} as any);

    const result = await loginUser({
      email: "test@example.com",
      password: "ValidPass123!",
    });

    expect(result.requiresTwoFactor).toBe(true);
  });

  it("should succeed with correct 2FA OTP", async () => {
    const mockUser = createMockUser({
      email: "test@example.com",
      passwordHash: await hashPassword("ValidPass123!"),
      isTwoFactorEnabled: true,
    });

    const mockOtp = {
      id: "otp-1",
      userId: mockUser.id,
      email: mockUser.email,
      code: "123456",
      type: "TWO_FACTOR",
      consumed: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
    };

    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(db.otpCode.findFirst).mockResolvedValue(mockOtp as any);
    vi.mocked(db.otpCode.update).mockResolvedValue({ ...mockOtp, consumed: true } as any);

    const result = await loginUser({
      email: "test@example.com",
      password: "ValidPass123!",
      otpCode: "123456",
    });

    expect(result.requiresTwoFactor).toBe(false);
    expect(db.otpCode.update).toHaveBeenCalled();
  });

  it("should throw InvalidOtpError for wrong 2FA OTP", async () => {
    const mockUser = createMockUser({
      email: "test@example.com",
      passwordHash: await hashPassword("ValidPass123!"),
      isTwoFactorEnabled: true,
    });

    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(db.otpCode.findFirst).mockResolvedValue(null);

    await expect(
      loginUser({
        email: "test@example.com",
        password: "ValidPass123!",
        otpCode: "wrong-code",
      })
    ).rejects.toThrow(InvalidOtpError);
  });
});

