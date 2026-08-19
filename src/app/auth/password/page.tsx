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
import { AuthContainer, authFormGap, authButtonsGap } from "@/shared/ui/auth/container";
import { AuthMessage } from "@/shared/ui/auth/message";
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
          setError("Something went wrong. Please try again.");
        }
      } catch (error) {
        console.error("Email check error:", error);
        setError("Something went wrong. Please try again.");
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
      password: z.string().min(1, "Enter password"),
    })),
  });

  const handleLogin = async (data: { email: string; password: string }) => {
    console.log("handleLogin called with:", { email: data.email, passwordLength: data.password.length });
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);

    try {
      console.log("Calling loginAction...");
      const result = await loginAction(formData);
      console.log("loginAction result:", result);

      if (result?.error) {
        // Error messages are already in Russian from server
        setError(result.error);
        setIsLoading(false);
      } else if (result?.success && result?.redirectUrl) {
        console.log("Login successful, redirecting to:", result.redirectUrl);
        window.location.href = result.redirectUrl;
      } else {
        console.error("Unexpected result:", result);
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    console.log("handleRegister called with:", { email: data.email, passwordLength: data.password.length, confirmPasswordLength: data.confirmPassword.length });
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);

    try {
      console.log("Calling registerAction...");
      const result = await registerAction(formData);
      console.log("registerAction result:", result);

      if (result?.error) {
        // Error messages are already in English from server
        setError(result.error);
        setIsLoading(false);
      } else if (result?.success && result?.redirectUrl) {
        console.log("Registration successful, redirecting to:", result.redirectUrl);
        window.location.href = result.redirectUrl;
      } else {
        console.error("Unexpected result:", result);
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Failed to create account. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await loginWithGoogleAction();
  };

  if (isChecking) {
    return (
      <AuthContainer>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthContainer>
    );
  }

  if (!emailStatus) {
    return (
      <AuthContainer title="Error">
        <Link href="/auth/email">
          <Button variant="primary" className="w-full">Back to email input</Button>
        </Link>
      </AuthContainer>
    );
  }

  // CASE 3: Google-only account
  if (emailStatus.isGoogleOnly) {
    return (
      <AuthContainer 
        title="Вход через Google"
        description={<>Этот e-mail привязан к Google. <br />Продолжите вход через Google.</>}
      >
        <AuthMessage type="info">
          Этот e-mail привязан к Google.
        </AuthMessage>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            isLoading={isLoading}
            variant="primary"
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
      </AuthContainer>
    );
  }

  // CASE 1: User exists with password - show login
  if (emailStatus.exists && emailStatus.hasPassword) {
    return (
      <AuthContainer 
        title="Enter password"
        description={<>Enter your password <br />to sign in to your account.</>}
      >
        <form
          onSubmit={loginForm.handleSubmit((data) => {
            console.log("Form submit handler called with data:", data);
            handleLogin({ password: data.password, email });
          })}
          className={`flex flex-col ${authFormGap}`}
        >
          <PasswordInput
            label="Password"
            {...loginForm.register("password")}
            error={(loginForm.formState.errors.password?.message as string) || error || undefined}
            floatingLabel={true}
            autoFocus
          />

          <Button type="submit" isLoading={isLoading} variant="primary" className="w-full">
            Sign in
          </Button>
        </form>

        <div className={`flex flex-col ${authButtonsGap}`}>
          <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="block text-left">
            <Button variant="ghost" className="w-full">
              Forgot password?
            </Button>
          </Link>

          <Link href="/auth/email">
            <Button variant="ghost" className="w-full">
              ← Change email
            </Button>
          </Link>
        </div>
      </AuthContainer>
    );
  }

  // CASE 2: User doesn't exist - show registration
  return (
    <AuthContainer 
      title="Create password"
      description={<>Create a secure password for your account. <br />Make sure it's strong and memorable.</>}
    >
      <form
        onSubmit={registerForm.handleSubmit(
          (data) => {
            console.log("Form submit handler called with data:", data);
            handleRegister({ ...data, email: email || data.email });
          },
          (errors) => {
            console.log("Form validation errors:", errors);
            // Show first error to user
            const firstError = Object.values(errors)[0];
            if (firstError?.message) {
              setError(firstError.message as string);
            }
          }
        )}
        className="space-y-4"
      >
        {/* Hidden email field for form validation */}
        <input type="hidden" {...registerForm.register("email")} value={email} />
        
        <PasswordInput
          label="Password"
          {...registerForm.register("password")}
          error={
            (registerForm.formState.errors.password?.message as string) || error || undefined
          }
          showRequirements={true}
          validationErrors={passwordValidation.errors}
          validationWarnings={passwordValidation.warnings}
          passwordValue={watchedRegisterPassword}
          email={email}
          floatingLabel={true}
        />

        <PasswordInput
          label="Confirm password"
          {...registerForm.register("confirmPassword")}
          error={
            registerForm.formState.errors.confirmPassword?.message as string
          }
          floatingLabel={true}
        />
      </form>

      <Button 
        type="button" 
        onClick={(e) => {
          e.preventDefault();
          registerForm.handleSubmit(
            (data) => {
              console.log("Form submit handler called with data:", data);
              handleRegister({ ...data, email: email || data.email });
            },
            (errors) => {
              console.log("Form validation errors:", errors);
              // Show first error to user
              const firstError = Object.values(errors)[0];
              if (firstError?.message) {
                setError(firstError.message as string);
              }
            }
          )();
        }}
        isLoading={isLoading} 
        variant="primary" 
        className="w-full mt-0"
      >
        Create account
      </Button>

      <p className="text-small text-white-600 text-left">
        By creating an account, you confirm that you are 18 years or older and agree to the{" "}
        <Link href="/privacy" className="underline hover:text-white-900 transition-colors">
          Privacy Policy
        </Link>
        .
      </p>

      <Link href="/auth/email">
        <Button variant="ghost" className="w-full">
          ← Change email
        </Button>
      </Link>
    </AuthContainer>
  );
}

export default function PasswordPage() {
  return (
    <Suspense fallback={
      <AuthContainer>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthContainer>
    }>
      <PasswordPageForm />
    </Suspense>
  );
}

