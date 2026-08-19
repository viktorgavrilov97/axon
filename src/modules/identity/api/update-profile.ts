"use server";

import { z } from "zod";
import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { uploadAvatarBuffer } from "@/shared/lib/avatar-storage";
import { generateAvatarColor } from "@/shared/lib/avatar-color";
import { cookies } from "next/headers";

const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).trim(),
  telegramUsername: z.string().max(32).trim().optional().or(z.literal("")),
});

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      error: "Unauthorized",
    };
  }

  const displayName = formData.get("displayName");
  const telegramUsername = formData.get("telegramUsername") as string | null;
  const avatarFile = formData.get("avatar") as File | null;
  const referralCode = formData.get("referralCode") as string | null;

  const parsed = UpdateProfileSchema.safeParse({ 
    displayName,
    telegramUsername: telegramUsername?.trim() || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid display name",
      fieldErrors: parsed.error.flatten(),
    };
  }

  let avatarUrl: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    try {
      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      avatarUrl = await uploadAvatarBuffer({
        userId: user.id,
        buffer,
        contentType: avatarFile.type || "image/jpeg",
      });
    } catch (error) {
      console.error("[UpdateProfile] Failed to upload avatar:", error);
      return {
        ok: false,
        error: "Failed to upload avatar. Please try again.",
      };
    }
  }

  // Generate avatar color if not set
  const avatarColor = generateAvatarColor(user.email ?? user.id);

  // Handle referral code if provided and user doesn't have a parent yet
  let referralParentId: string | undefined;
  if (referralCode && referralCode.trim()) {
    // Check if user already has a referral parent
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { referralParentId: true, referralCode: true },
    });

    // Prevent self-referral: check if the referral code is the user's own code
    if (currentUser?.referralCode === referralCode.trim()) {
      return {
        ok: false,
        error: "You cannot use your own referral code",
      };
    }

    // Only set referral parent if user doesn't have one yet
    if (!currentUser?.referralParentId) {
      const parentUser = await db.user.findUnique({
        where: { referralCode: referralCode.trim() },
        select: { id: true },
      });

      if (parentUser) {
        // Double-check: prevent self-referral by comparing IDs
        if (parentUser.id === user.id) {
          return {
            ok: false,
            error: "You cannot use your own referral code",
          };
        }
        referralParentId = parentUser.id;
      } else {
        return {
          ok: false,
          error: "Referral code not found",
        };
      }
    }
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName,
      telegramUsername: parsed.data.telegramUsername && parsed.data.telegramUsername.length > 0 
        ? parsed.data.telegramUsername 
        : null,
      ...(avatarUrl ? { avatarUrl } : {}),
      avatarColor,
      ...(referralParentId ? { referralParentId } : {}),
      hasCompletedOnboarding: true,
    },
  });

  // Clear referral code cookie after successful onboarding
  const cookieStore = await cookies();
  cookieStore.delete("pending_referral_code");

  return {
    ok: true,
    userId: updatedUser.id,
    avatarUrl: updatedUser.avatarUrl,
    displayName: updatedUser.displayName,
    telegramUsername: updatedUser.telegramUsername,
  };
}

