"use client";

import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export function ExitAdminButton() {
  const router = useRouter();

  const handleExit = () => {
    router.push("/operations");
  };

  return (
    <button
      onClick={handleExit}
      className="block w-full px-4 py-3 text-body rounded-xl transition-all duration-150 text-white-700 hover:text-white-900 hover:bg-onsurface-900 cursor-pointer"
    >
      <span className="flex items-center gap-3">
        <SignOut size={20} weight="regular" />
        <span>Exit admin mode</span>
      </span>
    </button>
  );
}

