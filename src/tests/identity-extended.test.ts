import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/modules/identity/api/reset-password";
import {
  verifyOtpAction,
  resendOtpAction,
} from "@/modules/identity/api/verify-otp";
import { checkEmailAction } from "@/modules/identity/api/check-email";
import {
  changePasswordAction,
  changeEmailAction,
  verifyEmailChangeAction,
} from "@/modules/identity/api/profile";
import {
  createOtpCode,
  verifyOtpCode,
  canResendOtp,
} from "@/modules/identity/lib/otp";
import { createMockUser } from "./test-utils";
import { hashPassword, verifyPassword } from "@/modules/identity/lib/password";

// Mock database
vi.mock("@/shared/lib/db", () => {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    otpCode: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
  };
  return { db: mockDb };
});

// Mock email service
vi.mock("@/modules/identity/lib/email", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordChangeNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock NextAuth signIn and auth
vi.mock("@/modules/identity/lib/auth", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
  auth: vi.fn().mockResolvedValue(null),
}));

// Mock Next.js cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => null),
    delete: vi.fn(),
  })),
}));

// Mock shared auth
vi.mock("@/shared/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  getServerSession: vi.fn(),
}));

import { db } from "@/shared/lib/db";
import { getCurrentUser } from "@/shared/lib/auth";

describe("Reset Password Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestPasswordResetAction", () => {
    it("should create OTP code and send email for existing user", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "test@example.com",
      });

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.otpCode.create).mockResolvedValue({
        id: "otp-1",
        email: "test@example.com",
        code: "123456",
        type: "PASSWORD_RESET",
        userId: "user-1",
        consumed: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      } as any);

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const result = await requestPasswordResetAction(formData);

      expect(result.success).toBe(true);
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(db.otpCode.create).toHaveBeenCalled();
    });

    it("should return error for non-existent user", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("email", "nonexistent@example.com");

      const result = await requestPasswordResetAction(formData);

      expect(result.error).toBe("User not found");
      expect(db.otpCode.create).not.toHaveBeenCalled();
    });
  });

  describe("resetPasswordAction", () => {
    it("should reset password with valid OTP code", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "test@example.com",
        passwordHash: await hashPassword("OldPass123!"),
      });

      const mockOtp = {
        id: "otp-1",
        email: "test@example.com",
        code: "123456",
        type: "PASSWORD_RESET",
        userId: "user-1",
        consumed: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(mockOtp as any);
      vi.mocked(db.otpCode.update).mockResolvedValue({
        ...mockOtp,
        consumed: true,
      } as any);
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        passwordHash: await hashPassword("NewPass123!"),
      } as any);
      vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 0 });

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "123456");
      formData.append("password", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      const result = await resetPasswordAction(formData);

      expect(result.success).toBe(true);
      expect(db.user.update).toHaveBeenCalled();
      expect(db.otpCode.update).toHaveBeenCalledWith({
        where: { id: "otp-1" },
        data: { consumed: true },
      });
      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });

    it("should reject invalid OTP code", async () => {
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "wrong-code");
      formData.append("password", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      const result = await resetPasswordAction(formData);

      // Error message will be validation error from schema (not "Invalid or expired code")
      // because code "wrong" doesn't match the 6-digit requirement
      expect(result.error).toBeDefined();
      expect(result.error).toContain("6 цифр"); // Schema validation error
      expect(db.user.update).not.toHaveBeenCalled();
    });

    it("should reject expired OTP code", async () => {
      const expiredOtp = {
        id: "otp-1",
        email: "test@example.com",
        code: "123456",
        type: "PASSWORD_RESET",
        userId: "user-1",
        consumed: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
      };

      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null); // Expired OTP not found

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "123456");
      formData.append("password", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      const result = await resetPasswordAction(formData);

      expect(result.error).toBe("Invalid or expired code");
    });

    it("should reject reused OTP code", async () => {
      const consumedOtp = {
        id: "otp-1",
        email: "test@example.com",
        code: "123456",
        type: "PASSWORD_RESET",
        userId: "user-1",
        consumed: true, // Already used
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null); // Consumed OTP not found

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "123456");
      formData.append("password", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      const result = await resetPasswordAction(formData);

      expect(result.error).toBe("Invalid or expired code");
    });

    it("should reject password mismatch", async () => {
      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "123456");
      formData.append("password", "NewPass123!");
      formData.append("confirmPassword", "DifferentPass123!");

      const result = await resetPasswordAction(formData);

      // Error message may be in Russian
      expect(result.error).toBeDefined();
      expect(result.error).toContain("совпадают");
    });
  });
});

describe("OTP Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createOtpCode", () => {
    it("should create OTP code with correct expiration", async () => {
      vi.mocked(db.otpCode.create).mockResolvedValue({
        id: "otp-1",
        email: "test@example.com",
        code: "123456",
        type: "EMAIL_VERIFICATION",
        userId: "user-1",
        consumed: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      } as any);

      const code = await createOtpCode(
        "test@example.com",
        "EMAIL_VERIFICATION",
        "user-1"
      );

      expect(code).toBeDefined();
      expect(db.otpCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "test@example.com",
          type: "EMAIL_VERIFICATION",
          userId: "user-1",
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe("verifyOtpCode", () => {
    it("should verify valid OTP code", async () => {
      const mockOtp = {
        id: "otp-1",
        email: "test@example.com",
        code: "123456",
        type: "EMAIL_VERIFICATION",
        userId: "user-1",
        consumed: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(db.otpCode.findFirst).mockResolvedValue(mockOtp as any);
      vi.mocked(db.otpCode.update).mockResolvedValue({
        ...mockOtp,
        consumed: true,
      } as any);

      const result = await verifyOtpCode(
        "test@example.com",
        "123456",
        "EMAIL_VERIFICATION"
      );

      expect(result.valid).toBe(true);
      expect(result.userId).toBe("user-1");
      expect(db.otpCode.update).toHaveBeenCalledWith({
        where: { id: "otp-1" },
        data: { consumed: true },
      });
    });

    it("should reject invalid OTP code", async () => {
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null);

      const result = await verifyOtpCode(
        "test@example.com",
        "wrong-code",
        "EMAIL_VERIFICATION"
      );

      expect(result.valid).toBe(false);
    });

    it("should reject expired OTP code", async () => {
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null); // Expired OTP not found

      const result = await verifyOtpCode(
        "test@example.com",
        "123456",
        "EMAIL_VERIFICATION"
      );

      expect(result.valid).toBe(false);
    });

    it("should reject already consumed OTP code", async () => {
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null); // Consumed OTP not found

      const result = await verifyOtpCode(
        "test@example.com",
        "123456",
        "EMAIL_VERIFICATION"
      );

      expect(result.valid).toBe(false);
    });
  });

  describe("verifyOtpAction", () => {
    it("should verify EMAIL_VERIFICATION OTP and update user", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "test@example.com",
        emailVerified: null,
      });

      const mockOtp = {
        id: "otp-1",
        email: "test@example.com",
        code: "123456",
        type: "EMAIL_VERIFICATION",
        userId: "user-1",
        consumed: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(db.otpCode.findFirst).mockResolvedValue(mockOtp as any);
      vi.mocked(db.otpCode.update).mockResolvedValue({
        ...mockOtp,
        consumed: true,
      } as any);
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        emailVerified: new Date(),
      } as any);
      vi.mocked(db.user.findUnique).mockResolvedValue({
        ...mockUser,
        emailVerified: new Date(),
      } as any);

      const result = await verifyOtpAction(
        "test@example.com",
        "123456",
        "EMAIL_VERIFICATION"
      );

      expect(result.success).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { emailVerified: expect.any(Date) },
      });
    });

    it("should reject invalid OTP code", async () => {
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null);

      const result = await verifyOtpAction(
        "test@example.com",
        "wrong-code",
        "EMAIL_VERIFICATION"
      );

      expect(result.error).toBe("Invalid or expired code");
    });
  });

  describe("canResendOtp", () => {
    it("should allow resend if no recent OTP", async () => {
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null);

      const result = await canResendOtp("test@example.com", "EMAIL_VERIFICATION");

      expect(result).toBe(true);
    });

    it("should block resend if recent OTP exists", async () => {
      const recentOtp = {
        id: "otp-1",
        email: "test@example.com",
        code: "123456",
        type: "EMAIL_VERIFICATION",
        createdAt: new Date(), // Recent
      };

      vi.mocked(db.otpCode.findFirst).mockResolvedValue(recentOtp as any);

      const result = await canResendOtp("test@example.com", "EMAIL_VERIFICATION");

      expect(result).toBe(false);
    });
  });
});

describe("checkEmailAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return exists: false for new email", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const result = await checkEmailAction("new@example.com");

    expect(result.success).toBe(true);
    expect(result.exists).toBe(false);
    expect(result.hasPassword).toBe(false);
  });

  it("should return exists: true with password for existing user", async () => {
    const mockUser = createMockUser({
      id: "user-1",
      email: "test@example.com",
      passwordHash: "hashed-password",
    });

    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...mockUser,
      accounts: [],
    } as any);

    const result = await checkEmailAction("test@example.com");

    expect(result.success).toBe(true);
    expect(result.exists).toBe(true);
    expect(result.hasPassword).toBe(true);
    expect(result.isGoogleOnly).toBe(false);
  });

  it("should detect Google-only account", async () => {
    const mockUser = createMockUser({
      id: "user-1",
      email: "test@example.com",
      passwordHash: null, // No password
    });

    vi.mocked(db.user.findUnique).mockResolvedValue({
      ...mockUser,
      accounts: [{ provider: "google" }], // Has Google account
    } as any);

    const result = await checkEmailAction("test@example.com");

    expect(result.success).toBe(true);
    expect(result.exists).toBe(true);
    expect(result.hasPassword).toBe(false);
    expect(result.isGoogleOnly).toBe(true);
  });
});

describe("Profile Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("changePasswordAction", () => {
    it("should change password with correct current password", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "test@example.com",
        passwordHash: await hashPassword("OldPass123!"),
      });

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(db.account.findFirst).mockResolvedValue(null); // No Google account
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        passwordHash: await hashPassword("NewPass123!"),
      } as any);
      vi.mocked(db.session.deleteMany).mockResolvedValue({ count: 0 });

      const formData = new FormData();
      formData.append("currentPassword", "OldPass123!");
      formData.append("newPassword", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      const result = await changePasswordAction(formData);

      expect(result.success).toBe(true);
      expect(db.user.update).toHaveBeenCalled();
      expect(db.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });

    it("should reject incorrect current password", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "test@example.com",
        passwordHash: await hashPassword("CorrectPass123!"),
      });

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(db.account.findFirst).mockResolvedValue(null);
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

      const formData = new FormData();
      formData.append("currentPassword", "WrongPass123!");
      formData.append("newPassword", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      const result = await changePasswordAction(formData);

      expect(result.error).toBe("Current password is incorrect");
      expect(db.user.update).not.toHaveBeenCalled();
    });

    it("should reject password change for Google OAuth accounts", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "test@example.com",
      });

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(db.account.findFirst).mockResolvedValue({
        provider: "google",
      } as any);

      const formData = new FormData();
      formData.append("currentPassword", "OldPass123!");
      formData.append("newPassword", "NewPass123!");
      formData.append("confirmPassword", "NewPass123!");

      const result = await changePasswordAction(formData);

      expect(result.error).toBe("Password change is not available for Google OAuth accounts");
    });
  });

  describe("changeEmailAction", () => {
    it("should send OTP to new email", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "old@example.com",
      });

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(db.account.findFirst).mockResolvedValue(null);
      // changeEmailAction calls db.user.findUnique to check if new email exists
      vi.mocked(db.user.findUnique).mockResolvedValue(null); // New email doesn't exist
      vi.mocked(db.otpCode.create).mockResolvedValue({
        id: "otp-1",
        email: "new@example.com",
        code: "123456",
        type: "EMAIL_VERIFICATION",
        userId: "user-1",
        consumed: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      } as any);

      const formData = new FormData();
      formData.append("newEmail", "new@example.com");

      const result = await changeEmailAction(formData);

      expect(result.success).toBe(true);
      expect(result.requiresVerification).toBe(true);
      expect(db.otpCode.create).toHaveBeenCalled();
    });

    it("should reject if new email already exists", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "old@example.com",
      });

      const existingUser = createMockUser({
        id: "user-2",
        email: "new@example.com",
      });

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(db.account.findFirst).mockResolvedValue(null);
      // changeEmailAction calls db.user.findUnique to check if new email exists
      vi.mocked(db.user.findUnique).mockResolvedValue(existingUser); // New email exists

      const formData = new FormData();
      formData.append("newEmail", "new@example.com");

      const result = await changeEmailAction(formData);

      expect(result.error).toBe("Email already in use");
      expect(db.otpCode.create).not.toHaveBeenCalled();
    });
  });

  describe("verifyEmailChangeAction", () => {
    it("should update email after OTP verification", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "old@example.com",
      });

      const mockOtp = {
        id: "otp-1",
        email: "new@example.com",
        code: "123456",
        type: "EMAIL_VERIFICATION",
        userId: "user-1",
        consumed: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        createdAt: new Date(),
      };

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(db.account.findFirst).mockResolvedValue(null);
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(mockOtp as any);
      vi.mocked(db.otpCode.update).mockResolvedValue({
        ...mockOtp,
        consumed: true,
      } as any);
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        email: "new@example.com",
        emailVerified: new Date(),
      } as any);

      const result = await verifyEmailChangeAction("new@example.com", "123456");

      expect(result.success).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          email: "new@example.com",
          emailVerified: expect.any(Date),
        },
      });
    });

    it("should reject invalid OTP code", async () => {
      const mockUser = createMockUser({
        id: "user-1",
        email: "old@example.com",
      });

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(db.account.findFirst).mockResolvedValue(null);
      vi.mocked(db.otpCode.findFirst).mockResolvedValue(null);

      const result = await verifyEmailChangeAction("new@example.com", "wrong-code");

      expect(result.error).toBe("Invalid or expired code");
      expect(db.user.update).not.toHaveBeenCalled();
    });
  });
});

