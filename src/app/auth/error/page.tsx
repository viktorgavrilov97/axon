"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import Link from "next/link";

function AuthErrorPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  // Handle case when user tries to sign in with Google but email already exists with password
  // This happens when signIn callback returns false
  // NextAuth redirects to error page with error="AccessDenied"
  const isEmailExistsWithPassword = error === "AccessDenied";

  if (isEmailExistsWithPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface-900">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 mb-4">
              <svg
                className="w-8 h-8 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-display mb-2">Вход через Google недоступен</h1>
            <p className="text-body text-white-600">
              Этот email уже зарегистрирован другим способом
            </p>
          </div>

          <div className="mb-6 p-6 bg-surface-800 border border-white-500 rounded-lg">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="w-5 h-5 text-white-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-body text-white-900 font-medium mb-1">
                    Почему это произошло?
                  </p>
                  <p className="text-small text-white-600">
                    Ваш аккаунт был создан через email и пароль. Для входа используйте форму входа с паролем.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-white-500">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="w-5 h-5 text-white-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-body text-white-900 font-medium mb-1">
                    Что делать?
                  </p>
                  <p className="text-small text-white-600">
                    Перейдите на страницу входа и используйте email и пароль для входа в аккаунт.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/auth/email">
              <Button className="w-full py-3">
                Перейти к входу
              </Button>
            </Link>

            <Link href="/register">
              <Button variant="ghost" className="w-full">
                Создать новый аккаунт
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generic error
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-900">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-redhaze/20 mb-4">
            <svg
              className="w-8 h-8 text-redhaze"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-display mb-2">Ошибка авторизации</h1>
          <p className="text-body text-white-600">
            Произошла ошибка при попытке входа
          </p>
        </div>

        <div className="mb-6 p-6 bg-surface-800 border border-redhaze rounded-lg">
          <p className="text-body text-white-900">
            {error
              ? `Код ошибки: ${error}`
              : "Неизвестная ошибка. Попробуйте ещё раз."}
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/auth/email">
            <Button className="w-full py-3">
              Вернуться к входу
            </Button>
          </Link>

          <Link href="/register">
            <Button variant="ghost" className="w-full">
              Зарегистрироваться
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 bg-surface-900">
          <div className="w-full max-w-md">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      }
    >
      <AuthErrorPageContent />
    </Suspense>
  );
}

