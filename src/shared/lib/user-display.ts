import type { User } from "@prisma/client";

/**
 * Get user display name with fallback chain:
 * displayName -> name -> email prefix -> "User"
 */
export function getUserDisplayName(
  user: Pick<User, "displayName" | "name"> & { email: string | null }
): string {
  if (user.displayName && user.displayName.trim().length > 0) {
    return user.displayName.trim();
  }
  if (user.name && user.name.trim().length > 0) {
    return user.name.trim();
  }
  if (user.email) {
    return user.email.split("@")[0];
  }
  return "User";
}

/**
 * Get user initial (first letter) for avatar fallback
 */
export function getUserInitial(
  user: Pick<User, "displayName" | "name"> & { email: string | null }
): string {
  const name = getUserDisplayName(user);
  return name.trim().charAt(0).toUpperCase();
}


