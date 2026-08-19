"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";

interface LoginButtonProps {
  href?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function LoginButton({ 
  href = "/auth/email", 
  children = "Login to platform",
  onClick 
}: LoginButtonProps) {
  const buttonContent = (
    <div className="bg-white-900 hover:bg-white-800 rounded-xl px-4 py-3 md:px-6 md:py-4 inline-flex items-center gap-8 md:gap-[60px] transition-colors w-full md:w-auto justify-center md:justify-start">
      <span className="text-surface-900 text-xs md:text-sm">{children}</span>
      <ArrowRight size={14} weight="regular" className="text-surface-900 md:w-4 md:h-4" />
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick}>
        {buttonContent}
      </button>
    );
  }

  return (
    <Link href={href}>
      {buttonContent}
    </Link>
  );
}

