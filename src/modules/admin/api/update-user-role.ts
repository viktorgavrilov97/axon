"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { z } from "zod";

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["USER", "ADMIN", "SUPERADMIN"]),
});

export async function updateUserRoleAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { error: "Not authorized" };
  }

  // Only SUPERADMIN can change roles
  if (currentUser.role !== "SUPERADMIN") {
    return { error: "Insufficient permissions. Only super admin can change roles." };
  }

  const rawData = {
    userId: formData.get("userId") as string,
    role: formData.get("role") as string,
  };

  const validation = updateRoleSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Invalid data" };
  }

  const { userId, role } = validation.data;

  // Prevent changing own role
  if (userId === currentUser.id) {
    return { error: "Cannot change your own role" };
  }

  // Check if trying to demote last SUPERADMIN
  if (role !== "SUPERADMIN") {
    const superAdminCount = await db.user.count({
      where: { role: "SUPERADMIN" },
    });

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (targetUser?.role === "SUPERADMIN" && superAdminCount === 1) {
      return {
        error:
          "Cannot demote the last super admin. There must be at least one super admin in the system.",
      };
    }
  }

  // Prevent ADMIN from promoting to SUPERADMIN (already checked above, but double-check)
  if (role === "SUPERADMIN" && currentUser.role !== "SUPERADMIN") {
    return { error: "Only super admin can assign super admins" };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { role },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { error: "Error updating role" };
  }
}

