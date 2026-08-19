import type { User, UserRole } from "@prisma/client";

/**
 * Check if user can access admin panel
 */
export function canAccessAdmin(user: User | null): boolean {
  return !!user && (user.role === "ADMIN" || user.role === "SUPERADMIN");
}

/**
 * Check if actor can change target user's role
 * 
 * @param actor - User who is trying to change the role
 * @param target - User whose role is being changed
 * @param newRole - New role to assign
 * @param hasOtherSuperAdmins - Whether there are other SUPERADMIN users in the system
 * @returns True if the role change is allowed
 */
export function canChangeUserRole(
  actor: User,
  target: User,
  newRole: UserRole,
  hasOtherSuperAdmins: boolean
): boolean {
  // USER can never change roles
  if (actor.role === "USER") {
    return false;
  }

  // Cannot change own role
  if (actor.id === target.id) {
    return false;
  }

  // ADMIN rules
  if (actor.role === "ADMIN") {
    // ADMIN cannot change SUPERADMIN roles
    if (target.role === "SUPERADMIN") {
      return false;
    }

    // ADMIN cannot assign SUPERADMIN
    if (newRole === "SUPERADMIN") {
      return false;
    }

    // ADMIN can change USER ↔ ADMIN
    return target.role === "USER" || target.role === "ADMIN";
  }

  // SUPERADMIN rules
  if (actor.role === "SUPERADMIN") {
    // Cannot demote last SUPERADMIN
    if (target.role === "SUPERADMIN" && !hasOtherSuperAdmins && newRole !== "SUPERADMIN") {
      return false;
    }

    // SUPERADMIN can change any role
    return true;
  }

  return false;
}

