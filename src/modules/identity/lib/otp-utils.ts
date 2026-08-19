import { OtpType } from "@prisma/client";

/**
 * Parse OTP type from URL string parameter to Prisma enum
 * Safe to use on client-side (no database dependencies)
 */
export function parseOtpType(typeStr: string | null): OtpType {
  if (!typeStr) return "EMAIL_VERIFICATION";
  
  // Convert URL param to enum value (email_verification -> EMAIL_VERIFICATION)
  const normalized = typeStr.toUpperCase().replace(/-/g, "_");
  
  if (normalized === "EMAIL_VERIFICATION" || normalized === "PASSWORD_RESET" || normalized === "TWO_FACTOR") {
    return normalized as OtpType;
  }
  
  return "EMAIL_VERIFICATION";
}

