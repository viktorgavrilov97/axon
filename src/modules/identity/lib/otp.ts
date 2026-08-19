import { db } from "@/shared/lib/db";
import { OtpType } from "@prisma/client";

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtpCode(
  email: string,
  type: OtpType,
  userId?: string
) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.otpCode.create({
    data: {
      email,
      code,
      type,
      expiresAt,
      userId: userId || null,
    },
  });

  return code;
}

export async function verifyOtpCode(
  email: string,
  code: string,
  type: OtpType
): Promise<{ valid: boolean; userId?: string }> {
  const otpCode = await db.otpCode.findFirst({
    where: {
      email,
      code,
      type,
      consumed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpCode) {
    return { valid: false };
  }

  await db.otpCode.update({
    where: { id: otpCode.id },
    data: { consumed: true },
  });

  return { valid: true, userId: otpCode.userId || undefined };
}

export async function canResendOtp(email: string, type: OtpType): Promise<boolean> {
  const recentOtp = await db.otpCode.findFirst({
    where: {
      email,
      type,
      createdAt: {
        gte: new Date(Date.now() - 60 * 1000), // 60 seconds ago
      },
    },
  });

  return !recentOtp;
}

