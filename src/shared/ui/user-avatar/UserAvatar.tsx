"use client";

import Image from "next/image";
import { getUserInitial } from "@/shared/lib/user-display";
import { ensureUserAvatarColor } from "@/shared/lib/avatar-color";

type UserAvatarProps = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    avatarColor: string | null;
  };
  size?: number; // px
  className?: string;
};

export function UserAvatar({
  user,
  size = 32,
  className,
}: UserAvatarProps) {
  const initial = getUserInitial(user);
  const color = ensureUserAvatarColor(user);

  if (user.avatarUrl) {
    return (
      <div
        className={`relative rounded-full overflow-hidden ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={user.avatarUrl}
          alt={user.displayName ?? user.name ?? user.email ?? "User avatar"}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full text-xs font-medium uppercase ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        color: "#000000", // Black text for better contrast on pastel backgrounds
      }}
    >
      {initial}
    </div>
  );
}




