"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/shared/ui/dropdown";
import { UserCircle, Terminal, SignOut, Question, BookOpen, Newspaper } from "@phosphor-icons/react";
import { logoutAction } from "@/modules/identity/api/logout";
import { UserAvatar } from "@/shared/ui/user-avatar";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { ProfileModal } from "@/modules/identity/components/ProfileModal";
import { SupportModal } from "@/modules/support/components/SupportModal";
import { ProfileMenuModal } from "./profile-menu-modal";

interface ProfileDropdownProps {
  userRole?: "USER" | "ADMIN" | "SUPERADMIN";
  user: {
    id: string;
    email: string | null;
    name: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    avatarColor: string | null;
  };
  isMobile?: boolean;
}

export function ProfileDropdown({ userRole, user: initialUser, isMobile = false }: ProfileDropdownProps) {
  const router = useRouter();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [user, setUser] = useState(initialUser);

  // Update user state when initialUser changes
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  // Listen for profile update events
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail;
      if (updatedUser) {
        setUser((prev) => ({
          ...prev,
          displayName: updatedUser.displayName ?? prev.displayName,
          avatarUrl: updatedUser.avatarUrl ?? prev.avatarUrl,
          avatarColor: updatedUser.avatarColor ?? prev.avatarColor,
        }));
      }
    };

    window.addEventListener('profile-updated' as any, handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('profile-updated' as any, handleProfileUpdate as EventListener);
    };
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    // Force full page reload to clear any cached data
    window.location.href = "/login";
  };

  const items = [
    {
      label: "My profile",
      icon: <UserCircle size={16} weight="regular" />,
      onClick: () => {
        setIsProfileModalOpen(true);
      },
    },
    ...(isMobile
      ? [
          {
            label: "News",
            icon: <Newspaper size={16} weight="regular" />,
            onClick: () => {
              router.push("/news");
            },
          },
          {
            label: "Knowledge Center",
            icon: <BookOpen size={16} weight="regular" />,
            onClick: () => {
              router.push("/knowledge-center");
            },
          },
        ]
      : []),
    {
      label: "Support",
      icon: <Question size={16} weight="regular" />,
      onClick: () => {
        setIsSupportModalOpen(true);
      },
    },
    ...(!isMobile && (userRole === "ADMIN" || userRole === "SUPERADMIN")
      ? [
          {
            label: "Root console",
            icon: <Terminal size={16} weight="regular" />,
            onClick: () => {
              router.push("/admin");
            },
          },
        ]
      : []),
    {
      label: "Logout",
      icon: <SignOut size={16} weight="regular" />,
      onClick: handleLogout,
    },
  ];

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsMenuModalOpen(true)}
          className="flex items-center justify-center w-full h-full"
        >
          <UserAvatar user={user} size={24} />
        </button>
        <ProfileMenuModal
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
          items={items}
        />
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
        <SupportModal
          isOpen={isSupportModalOpen}
          onClose={() => setIsSupportModalOpen(false)}
        />
      </>
    );
  }

  const trigger = (
    <button className="block w-full px-3 h-14 flex items-center gap-5 text-sm rounded-xl transition-all duration-0 active:bg-onsurface-800 text-white-700 hover:text-white-900 hover:bg-onsurface-900 cursor-pointer">
      <UserAvatar user={user} size={20} />
      <span className="truncate">{getUserDisplayName(user)}</span>
    </button>
  );

  return (
    <>
      <Dropdown trigger={trigger} items={items} />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
    </>
  );
}

