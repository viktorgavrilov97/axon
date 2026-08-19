import type { User } from "@prisma/client";

/**
 * Pastel color palette for avatar backgrounds
 * Colors are chosen to be visually distinct and pleasant
 */
const AVATAR_COLORS = [
  "#A5EACF", // Mint green
  "#C8B4F8", // Lavender
  "#D7C8FF", // Light purple
  "#F9D6A5", // Peach
  "#F3A5C8", // Pink
  "#A5D7F3", // Sky blue
  "#FFD4A5", // Apricot
  "#B4E8D4", // Seafoam
  "#E8D4F3", // Lilac
  "#FFE5A5", // Yellow
];

/**
 * Generate a stable avatar color from a seed string
 * Same seed will always produce the same color
 */
export function generateAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * 31) | 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Ensure user has an avatar color, generating one if missing
 */
export function ensureUserAvatarColor(
  user: Pick<User, "id" | "avatarColor"> & { email: string | null }
): string {
  if (user.avatarColor) {
    return user.avatarColor;
  }
  const seed = user.email ?? user.id;
  return generateAvatarColor(seed);
}


