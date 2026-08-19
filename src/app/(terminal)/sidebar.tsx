"use client";

import { Logo3D } from "@/app/components/Logo3D";
import { NavLink } from "@/shared/ui/nav-link";
import { ProfileDropdown } from "./profile-dropdown";
import { usePathname } from "next/navigation";
import { 
  Monitor, 
  Pulse, 
  CubeTransparent,
  BookOpen,
  UsersFour,
  Newspaper
} from "@phosphor-icons/react";

interface SidebarProps {
  userRole?: "USER" | "ADMIN" | "SUPERADMIN";
  user: {
    id: string;
    email: string | null;
    name: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    avatarColor: string | null;
  };
}

export function Sidebar({ userRole, user }: SidebarProps) {
  const pathname = usePathname();
  
  const iconClass = (href: string) => 
    pathname === href ? "text-white-900" : "text-white-700 group-hover:text-white-900";

  return (
    <>
      {/* Desktop Sidebar - visible on >= 1200px */}
      <aside className="hidden sidebar:flex fixed left-0 top-0 h-screen w-80 sidebar:w-[240px] sidebar-lg:w-[320px] flex-col">
        {/* Logo */}
        <div className="px-6 py-6 flex items-center gap-3">
          <Logo3D />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="flex flex-col gap-1">
            <li>
              <NavLink href="/terminal" className="group">
                <span className="flex items-center gap-5">
                  <Monitor size={20} weight="regular" className={iconClass("/terminal")} />
                  <span>Terminal</span>
                </span>
              </NavLink>
            </li>
            <li>
              <NavLink href="/strategies" className="group">
                <span className="flex items-center gap-5">
                  <CubeTransparent size={20} weight="regular" className={iconClass("/strategies")} />
                  <span>Strategies</span>
                </span>
              </NavLink>
            </li>
            <li>
              <NavLink href="/operations" className="group">
                <span className="flex items-center gap-5">
                  <Pulse size={20} weight="regular" className={iconClass("/operations")} />
                  <span>Operations</span>
                </span>
              </NavLink>
            </li>
            <li>
              <NavLink href="/affiliate" className="group">
                <span className="flex items-center gap-5">
                  <UsersFour size={20} weight="regular" className={iconClass("/affiliate")} />
                  <span>Affiliate</span>
                </span>
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Bottom Section: News, Materials, Profile */}
        <div className="px-3 py-4 space-y-1">
          <NavLink href="/news" className="group">
            <span className="flex items-center gap-5">
              <Newspaper size={20} weight="regular" className={iconClass("/news")} />
              <span>News</span>
            </span>
          </NavLink>
          <NavLink href="/knowledge-center" className="group">
            <span className="flex items-center gap-5">
              <BookOpen size={20} weight="regular" className={iconClass("/knowledge-center")} />
              <span>Knowledge Center</span>
            </span>
          </NavLink>
          <ProfileDropdown userRole={userRole} user={user} />
        </div>
      </aside>

      {/* Mobile Tabbar - visible on < 1200px */}
      <aside className="sidebar:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-onsurface-950 z-50">
        <nav className="h-full flex items-center justify-around px-2">
          <NavLink href="/terminal" className="group flex-1 flex items-center justify-center">
            <Monitor size={24} weight="regular" className={iconClass("/terminal")} />
          </NavLink>
          <NavLink href="/strategies" className="group flex-1 flex items-center justify-center">
            <CubeTransparent size={24} weight="regular" className={iconClass("/strategies")} />
          </NavLink>
          <NavLink href="/operations" className="group flex-1 flex items-center justify-center">
            <Pulse size={24} weight="regular" className={iconClass("/operations")} />
          </NavLink>
          <NavLink href="/affiliate" className="group flex-1 flex items-center justify-center">
            <UsersFour size={24} weight="regular" className={iconClass("/affiliate")} />
          </NavLink>
          <div className="flex-1 flex items-center justify-center">
            <ProfileDropdown userRole={userRole} user={user} isMobile />
          </div>
        </nav>
      </aside>
    </>
  );
}

