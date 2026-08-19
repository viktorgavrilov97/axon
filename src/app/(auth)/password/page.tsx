"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registerSchema,
} from "@/shared/lib/validations";
import { z } from "zod";
import { checkEmailAction } from "@/modules/identity/api/check-email";
import { loginAction, loginWithGoogleAction } from "@/modules/identity/api/login";
import { registerAction } from "@/modules/identity/api/register";
import { Input } from "@/shared/ui/inputs";
import { PasswordInput } from "@/shared/ui/inputs/password";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { validatePasswordClient } from "@/shared/lib/password-validation";

type EmailStatus = {
  exists: boolean;
  hasPassword: boolean;
  isGoogleOnly: boolean;
} | null;

function PasswordPageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const ref = searchParams.get("ref") || null; // Referral code from query params

  const [emailStatus, setEmailStatus] = useState<EmailStatus>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<{
    errors: string[];
    warnings: string[];
    isValid: boolean;
  }>({ errors: [], warnings: [], isValid: false });

  // Check email status on mount
  useEffect(() => {
    const checkEmail = async () => {
      if (!email) {
        router.push("/auth/email");
        return;
      }

      setIsChecking(true);
      try {
        const result = await checkEmailAction(email);

        if (result?.error) {
          setError(result.error);
          setIsChecking(false);
          return;
        }

        if (result?.success) {
          setEmailStatus({
            exists: result.exists,
            hasPassword: result.hasPassword || false,
            isGoogleOnly: result.isGoogleOnly || false,
          });
        } else {
          setError("Что-то пошло не так. Попробуйте ещё раз.");
        }
      } catch (error) {
        console.error("Email check error:", error);
        setError("Что-то пошло не так. Попробуйте ещё раз.");
      } finally {
        setIsChecking(false);
      }
    };

    checkEmail();
  }, [email, router]);

  // Registration form (for new users)
  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: email, // Set email from query params
      password: "",
      confirmPassword: "",
    },
  });

  // Update email in form when it changes
  useEffect(() => {
    if (email) {
      registerForm.setValue("email", email);
    }
  }, [email, registerForm]);

  const watchedRegisterPassword = registerForm.watch("password", "");

  useEffect(() => {
    if (watchedRegisterPassword) {
      const validation = validatePasswordClient(watchedRegisterPassword, email);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation({ errors: [], warnings: [], isValid: false });
    }
  }, [watchedRegisterPassword, email]);

  // Login form (for existing users)
  // Only validate password, email comes from query params
  const loginForm = useForm<{ password: string }>({
    resolver: zodResolver(z.object({
      password: z.string().min(1, "Введите пароль"),
    })),
  });

  const handleLogin = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);

    try {
      const result = await loginAction(formData);

      if (result?.error) {
        // Error messages are already in Russian from server
        setError(result.error);
        setIsLoading(false);
      } else if (result?.success && result?.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setError("Что-то пошло не так. Попробуйте ещё раз.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Что-то пошло не так. Попробуйте ещё раз.");
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);
    if (ref) {
      formData.append("referralCode", ref);
    }

    try {
      const result = await registerAction(formData);

      if (result?.error) {
        // Error messages are already in Russian from server
        setError(result.error);
        setIsLoading(false);
      } else if (result?.success && result?.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setError("Что-то пошло не так. Попробуйте ещё раз.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Что-то пошло не так. Попробуйте ещё раз.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await loginWithGoogleAction();
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!emailStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-display mb-8 text-center">Ошибка</h1>
          {error && (
            <div className="mb-4 p-4 bg-surface-800 border border-redhaze text-redhaze text-body">
              {error}
            </div>
          )}
          <Link href="/auth/email">
            <Button className="w-full">Вернуться к вводу email</Button>
          </Link>
        </div>
      </div>
    );
  }

  // CASE 3: Google-only account
  if (emailStatus.isGoogleOnly) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="text-display mb-8 text-center">Вход через Google</h1>

          <div className="mb-6 p-4 bg-surface-800 border border-white-500 text-white-600 text-body">
            <p>Этот e-mail привязан к Google.</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-surface-800 border border-redhaze text-redhaze text-body">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              isLoading={isLoading}
              className="w-full"
            >
              Продолжить через Google
            </Button>

            <Link href="/auth/email">
              <Button variant="ghost" className="w-full">
                ← Изменить e-mail
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // CASE 1: User exists with password - show login
  if (emailStatus.exists && emailStatus.hasPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="text-display mb-8 text-center">Введите пароль</h1>

          {error && (
            <div className="mb-4 p-4 bg-surface-800 border border-redhaze text-redhaze text-body">
              {error}
            </div>
          )}

          <form
            onSubmit={loginForm.handleSubmit((data) =>
              handleLogin({ password: data.password, email })
            )}
            className="space-y-4 mb-6"
          >
            <PasswordInput
              label="Пароль"
              {...loginForm.register("password")}
              error={loginForm.formState.errors.password?.message as string}
              autoFocus
            />

            <Button type="submit" isLoading={isLoading} className="w-full">
              Войти
            </Button>
          </form>

          <div className="space-y-4">
            <Link href="/forgot-password" className="block text-center">
              <Button variant="ghost" className="w-full">
                Забыли пароль?
              </Button>
            </Link>

            <Link href="/auth/email">
              <Button variant="ghost" className="w-full">
                ← Изменить e-mail
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // CASE 2: User doesn't exist - show registration
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        <h1 className="text-display mb-8 text-center">Создайте пароль</h1>

        {error && (
          <div className="mb-4 p-4 bg-surface-800 border border-redhaze text-redhaze text-body">
            {error}
          </div>
        )}

        <form
          onSubmit={registerForm.handleSubmit(
            (data) => {
              handleRegister({ ...data, email: email || data.email });
            },
            (errors) => {
              // Show first error to user
              const firstError = Object.values(errors)[0];
              if (firstError?.message) {
                setError(firstError.message as string);
              }
            }
          )}
          className="space-y-4 mb-6"
        >
          {/* Hidden email field for form validation */}
          <input type="hidden" {...registerForm.register("email")} value={email} />
          
          <PasswordInput
            label="Пароль"
            {...registerForm.register("password")}
            error={
              registerForm.formState.errors.password?.message as string
            }
            showRequirements={true}
            validationErrors={passwordValidation.errors}
            validationWarnings={passwordValidation.warnings}
            passwordValue={watchedRegisterPassword}
            email={email}
          />

          <PasswordInput
            label="Подтвердите пароль"
            {...registerForm.register("confirmPassword")}
            error={
              registerForm.formState.errors.confirmPassword?.message as string
            }
          />

          <Button type="submit" isLoading={isLoading} className="w-full">
            Создать аккаунт
          </Button>
        </form>

        <Link href="/auth/email">
          <Button variant="ghost" className="w-full">
            ← Изменить e-mail
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function PasswordPage() {
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
      <PasswordPageForm />
    </Suspense>
  );
}

