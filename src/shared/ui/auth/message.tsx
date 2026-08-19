import { type ReactNode } from "react";

interface AuthMessageProps {
  type: "success" | "error" | "info";
  children: ReactNode;
  className?: string;
}

export function AuthMessage({ type, children, className = "" }: AuthMessageProps) {
  const typeClasses = {
    success: "bg-surface-800 border border-mint text-mint",
    error: "bg-surface-800 border border-redhaze text-redhaze",
    info: "bg-surface-800 border border-white-500 text-white-600",
  };

  return (
    <div className={`mb-4 p-4 text-body rounded ${typeClasses[type]} ${className}`}>
      {children}
    </div>
  );
}

