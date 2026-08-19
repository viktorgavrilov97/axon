import { describe, it, expect } from "vitest";
import { canAccessAdmin, canChangeUserRole } from "@/modules/admin/lib/access";
import { createMockUser } from "./test-utils";
import type { UserRole } from "@prisma/client";

describe("canAccessAdmin", () => {
  it("should return false for null user", () => {
    expect(canAccessAdmin(null)).toBe(false);
  });

  it("should return false for USER role", () => {
    const user = createMockUser({ role: "USER" });
    expect(canAccessAdmin(user)).toBe(false);
  });

  it("should return true for ADMIN role", () => {
    const user = createMockUser({ role: "ADMIN" });
    expect(canAccessAdmin(user)).toBe(true);
  });

  it("should return true for SUPERADMIN role", () => {
    const user = createMockUser({ role: "SUPERADMIN" });
    expect(canAccessAdmin(user)).toBe(true);
  });
});

describe("canChangeUserRole", () => {
  it("should return false when USER tries to change roles", () => {
    const actor = createMockUser({ role: "USER", id: "actor-1" });
    const target = createMockUser({ role: "USER", id: "target-1" });

    expect(canChangeUserRole(actor, target, "ADMIN", false)).toBe(false);
  });

  it("should return false when trying to change own role", () => {
    const actor = createMockUser({ role: "ADMIN", id: "user-1" });
    const target = createMockUser({ role: "USER", id: "user-1" });

    expect(canChangeUserRole(actor, target, "ADMIN", false)).toBe(false);
  });

  it("should return false when ADMIN tries to change SUPERADMIN role", () => {
    const actor = createMockUser({ role: "ADMIN", id: "actor-1" });
    const target = createMockUser({ role: "SUPERADMIN", id: "target-1" });

    expect(canChangeUserRole(actor, target, "USER", false)).toBe(false);
  });

  it("should return false when ADMIN tries to assign SUPERADMIN", () => {
    const actor = createMockUser({ role: "ADMIN", id: "actor-1" });
    const target = createMockUser({ role: "USER", id: "target-1" });

    expect(canChangeUserRole(actor, target, "SUPERADMIN", false)).toBe(false);
  });

  it("should return true when ADMIN changes USER to ADMIN", () => {
    const actor = createMockUser({ role: "ADMIN", id: "actor-1" });
    const target = createMockUser({ role: "USER", id: "target-1" });

    expect(canChangeUserRole(actor, target, "ADMIN", false)).toBe(true);
  });

  it("should return true when ADMIN changes ADMIN to USER", () => {
    const actor = createMockUser({ role: "ADMIN", id: "actor-1" });
    const target = createMockUser({ role: "ADMIN", id: "target-1" });

    expect(canChangeUserRole(actor, target, "USER", false)).toBe(true);
  });

  it("should return false when SUPERADMIN tries to demote last SUPERADMIN", () => {
    const actor = createMockUser({ role: "SUPERADMIN", id: "actor-1" });
    const target = createMockUser({ role: "SUPERADMIN", id: "target-1" });

    expect(canChangeUserRole(actor, target, "ADMIN", false)).toBe(false);
  });

  it("should return true when SUPERADMIN demotes SUPERADMIN if others exist", () => {
    const actor = createMockUser({ role: "SUPERADMIN", id: "actor-1" });
    const target = createMockUser({ role: "SUPERADMIN", id: "target-1" });

    expect(canChangeUserRole(actor, target, "ADMIN", true)).toBe(true);
  });

  it("should return true when SUPERADMIN changes USER to ADMIN", () => {
    const actor = createMockUser({ role: "SUPERADMIN", id: "actor-1" });
    const target = createMockUser({ role: "USER", id: "target-1" });

    expect(canChangeUserRole(actor, target, "ADMIN", false)).toBe(true);
  });

  it("should return true when SUPERADMIN assigns SUPERADMIN if others exist", () => {
    const actor = createMockUser({ role: "SUPERADMIN", id: "actor-1" });
    const target = createMockUser({ role: "USER", id: "target-1" });

    expect(canChangeUserRole(actor, target, "SUPERADMIN", true)).toBe(true);
  });
});

