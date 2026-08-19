"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}

export function NavLink({
  href,
  children,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
}: NavLinkProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname === href;

  // Prefetch route on mount and on hover for faster navigation
  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);

  const handleMouseEnter = () => {
    // Prefetch on hover for instant navigation
    router.prefetch(href);
  };

  const baseClasses = `block px-3 h-12 flex items-center text-sm rounded-xl transition-all duration-0 active:bg-onsurface-800 ${
    isActive
      ? `text-white-900 bg-onsurface-900 ${activeClassName}`
      : `text-white-600 hover:text-white-900 hover:bg-onsurface-900 ${inactiveClassName}`
  }`;

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      className={`${baseClasses} ${className} cursor-pointer`}
      prefetch={true}
    >
      {children}
    </Link>
  );
}
