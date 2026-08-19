"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { loginWithGoogleAction } from "@/modules/identity/api/login";

function AuthErrorPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await loginWithGoogleAction();
  };

  // Handle case when user tries to sign in with Google but email already exists with password
  // This happens when signIn callback returns false
  // NextAuth redirects to error page with error="AccessDenied"
  // We show appropriate message for this case
  const isEmailExistsWithPassword = error === "AccessDenied";

  // Handle case when Google account is already linked to another user
  // This happens when OAuthAccountNotLinked error occurs
  const isOAuthAccountNotLinked = error === "OAuthAccountNotLinked";

  if (isEmailExistsWithPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="text-display mb-8 text-center">Email уже зарегистрирован</h1>

          <div className="mb-6 p-4 bg-surface-800 border border-white-500 text-white-600 text-body">
            <p className="mb-2">
              Этот email уже зарегистрирован через email/password.
            </p>
            <p>
              Для входа используйте пароль. Вход через Google недоступен для аккаунтов, созданных через email/password.
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/auth/email">
              <Button className="w-full">
                Войти через email/password
              </Button>
            </Link>

            <Link href="/auth/email">
              <Button variant="ghost" className="w-full">
                ← Вернуться назад
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isOAuthAccountNotLinked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
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
            <h1 className="text-display mb-2">Аккаунт уже связан</h1>
            <p className="text-body text-white-600">
              Этот Google аккаунт уже связан с другим пользователем в системе
            </p>
          </div>

          <div className="mb-6 p-4 bg-surface-800 border border-white-500 text-white-600 text-body">
            <p className="mb-2">
              Возможные причины:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Вы уже зарегистрировались через этот Google аккаунт ранее</li>
              <li>Этот Google аккаунт используется другим пользователем</li>
            </ul>
            <p className="mt-3">
              Если это ваш аккаунт, попробуйте войти через email/password с тем же email адресом, который использовался при регистрации.
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/auth/email">
              <Button className="w-full">
                Войти через email/password
              </Button>
            </Link>

            <Link href="/login">
              <Button variant="ghost" className="w-full">
                ← Вернуться к входу
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generic error
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <h1 className="text-display mb-8 text-center">Ошибка авторизации</h1>

        <div className="mb-6 p-4 bg-surface-800 border border-redhaze text-redhaze text-body">
          <p>Произошла ошибка при авторизации. Попробуйте ещё раз.</p>
        </div>

        <div className="space-y-4">
          <Link href="/auth/email">
            <Button className="w-full">
              Вернуться к входу
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    }>
      <AuthErrorPageContent />
    </Suspense>
  );
}

