"use client";

import { SignOut } from "@phosphor-icons/react";
import { logoutAction } from "@/modules/identity/api/logout";

export function LogoutButton() {
  const handleLogout = async () => {
    await logoutAction();
    // Force full page reload to clear any cached data
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleLogout}
      className="block w-full px-4 py-3 text-body rounded-xl transition-all duration-150 text-white-600 hover:text-white-900 hover:bg-onsurface-900 cursor-pointer"
    >
      <span className="flex items-center gap-3">
        <SignOut size={20} weight="regular" />
        <span>Sign out</span>
      </span>
    </button>
  );
}

