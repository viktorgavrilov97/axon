"use client";

import { Logo3D } from "@/app/components/Logo3D";
import { NavLink } from "@/shared/ui/nav-link";
import {
  ChartBar,
  Users,
  ArrowDown,
  ArrowUp,
  CubeTransparent,
  BookOpen,
  Flask,
  Newspaper
} from "@phosphor-icons/react";
import { ExitAdminButton } from "./exit-admin-button";

export function AdminSidebar({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-80 flex flex-col border-r border-onsurface-950 bg-black">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <Logo3D />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="flex flex-col gap-1">
          <li>
            <NavLink href="/admin">
              <span className="flex items-center gap-5">
                <ChartBar size={20} weight="regular" />
                <span>Dashboard</span>
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink href="/admin/investors">
              <span className="flex items-center gap-5">
                <Users size={20} weight="regular" />
                <span>Investors</span>
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink href="/admin/deposits">
              <span className="flex items-center gap-5">
                <ArrowDown size={20} weight="regular" />
                <span>Deposits</span>
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink href="/admin/withdrawals">
              <span className="flex items-center gap-5">
                <ArrowUp size={20} weight="regular" />
                <span>Withdrawals</span>
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink href="/admin/strategies">
              <span className="flex items-center gap-5">
                <CubeTransparent size={20} weight="regular" />
                <span>Strategies</span>
              </span>
            </NavLink>
          </li>
          {/* Integrations - hidden but functionality preserved */}
          {/* <li>
            <NavLink href="/admin/integrations">
              <span className="flex items-center gap-5">
                <CubeTransparent size={20} weight="regular" />
                <span>Integrations</span>
              </span>
            </NavLink>
          </li> */}
          <li>
            <NavLink href="/admin/posts">
              <span className="flex items-center gap-5">
                <Newspaper size={20} weight="regular" />
                <span>News</span>
              </span>
            </NavLink>
          </li>
          <li>
            <NavLink href="/admin/knowledge-center">
              <span className="flex items-center gap-5">
                <BookOpen size={20} weight="regular" />
                <span>Knowledge Center</span>
              </span>
            </NavLink>
          </li>
          {isSuperAdmin && (
            <li>
              <NavLink href="/admin/test-balances">
                <span className="flex items-center gap-5">
                  <Flask size={20} weight="regular" />
                  <span>Test Balances</span>
                </span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* Exit Admin Mode Button */}
      <div className="p-4">
        <ExitAdminButton />
      </div>
    </aside>
  );
}

