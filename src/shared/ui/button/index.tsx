"use client";

import { type ButtonHTMLAttributes, type ReactNode, useRef } from "react";
import { Spinner } from "../spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  className = "",
  onClick,
  ...props
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Remove arrow symbols from text if present
  let displayContent = children;
  if (typeof children === "string") {
    displayContent = children.replace(/[→←↗↘]/g, "").trim();
  }
  
  const baseClasses =
    "inline-flex items-center justify-center text-callout rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden whitespace-nowrap";
  
  const sizeClasses = {
    sm: "px-4 py-3",
    md: "px-6 py-4",
    lg: "px-12 py-5",
  };
  
  const variantClasses = {
    primary: "bg-white-900 text-surface-900 hover:opacity-90",
    secondary: "bg-onsurface-850 text-white-900 hover:opacity-90",
    ghost: "bg-transparent text-white-600 hover:bg-onsurface-900 hover:text-white-900",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    const button = buttonRef.current;
    if (!button) return;

    const ripple = document.createElement("span");
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.position = "absolute";
    ripple.style.borderRadius = "50%";
    ripple.style.background = "rgba(255, 255, 255, 0.3)";
    ripple.style.transform = "scale(0)";
    ripple.style.animation = "ripple 600ms ease-out";
    ripple.style.pointerEvents = "none";

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);

    onClick?.(e);
  };

  return (
    <button
      ref={buttonRef}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" className="border-current relative z-10" />
      ) : (
        <span className="relative z-10 flex items-center gap-2">{displayContent}</span>
      )}
    </button>
  );
}

