import { type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-start justify-center bg-surface-950 px-4 pt-8 pb-10 sm:items-center sm:p-8">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

