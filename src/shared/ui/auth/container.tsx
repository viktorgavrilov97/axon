"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Logo3D } from "@/app/components/Logo3D";

interface AuthContainerProps {
  children?: ReactNode;
  title?: string;
  description?: ReactNode;
  className?: string;
}

// Переменные для управления отступами
const CONTAINER_GAP = "gap-8"; // Отступ между элементами в контейнере
const FORM_GAP = "gap-6"; // Отступ между элементами в формах (инпут и кнопка)
const TITLE_MARGIN = "mb-4"; // Отступ снизу у заголовка
const BUTTONS_GAP = "mt-6"; // Отступ между основной кнопкой и дополнительными кнопками

export function AuthContainer({ children, title, description, className = "" }: AuthContainerProps) {
  return (
    <div className="w-full animate-fade-in">
      <div className={`bg-surface-900 border border-surface-900 rounded-2xl px-8 py-8 flex flex-col ${CONTAINER_GAP} ${className}`}>
        {/* Логотип сверху слева */}
        <div className="mb-4 animate-fade-in">
          <Link href="/">
            <Logo3D />
          </Link>
        </div>
        
        {(title || description) && (
          <div className="flex flex-col gap-4">
            {title && (
              <h1 className="text-display text-left">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-body text-white-600 text-left">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// Экспортируем переменные для использования в формах
export const authFormGap = FORM_GAP;
export const authButtonsGap = BUTTONS_GAP;

