"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordSchema } from "@/shared/lib/validations";
import {
  resetPasswordWithTokenAction,
  verifyResetTokenAction,
} from "@/modules/identity/api/reset-password-token";
import { PasswordInput } from "@/shared/ui/inputs/password";
import { Button } from "@/shared/ui/button";
import { AuthContainer, authFormGap } from "@/shared/ui/auth/container";
import { AuthMessage } from "@/shared/ui/auth/message";
import Link from "next/link";
import { validatePasswordClient } from "@/shared/lib/password-validation";
import { z } from "zod";

function ResetPasswordPageForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<{
    errors: string[];
    warnings: string[];
    isValid: boolean;
  }>({ errors: [], warnings: [], isValid: false });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{
    password: string;
    confirmPassword: string;
  }>({
    resolver: zodResolver(
      z.object({
        password: passwordSchema,
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      })
    ),
  });

  const watchedPassword = watch("password", "");

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Token not provided");
        setIsVerifying(false);
        return;
      }

      try {
        const result = await verifyResetTokenAction(token);
        if (result.valid) {
          setTokenValid(true);
        } else {
          setError(result.error || "Link is invalid or expired");
        }
      } catch (error) {
        console.error("Token verification error:", error);
        setError("Error verifying token");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Update validation when password changes
  useEffect(() => {
    if (watchedPassword) {
      const validation = validatePasswordClient(watchedPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation({ errors: [], warnings: [], isValid: false });
    }
  }, [watchedPassword]);

  const onSubmit = async (data: {
    password: string;
    confirmPassword: string;
  }) => {
    console.log("Reset password form submitted:", { passwordLength: data.password.length, confirmPasswordLength: data.confirmPassword.length });
    setIsLoading(true);
    setError(null);

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("token", token);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);

    try {
      console.log("Calling resetPasswordWithTokenAction...");
      const result = await resetPasswordWithTokenAction(formData);
      console.log("resetPasswordWithTokenAction result:", result);

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      } else if (result?.success && result?.redirectUrl) {
        console.log("Password reset successful, redirecting to:", result.redirectUrl);
        // Redirect on client side
        window.location.href = result.redirectUrl;
      } else {
        console.error("Unexpected result:", result);
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Reset password form error:", error);
      setError("Failed to reset password. Please try again.");
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <AuthContainer>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthContainer>
    );
  }

  if (!tokenValid) {
    return (
      <AuthContainer 
        title="Invalid link"
        description={<>The password reset link is invalid or has expired. <br />Please request a new link.</>}
      >
        <AuthMessage type="info">
          <p>
            The password reset link is invalid or expired.
          </p>
          <p>Please request a new link.</p>
        </AuthMessage>

        <div className="text-left space-y-4">
          <Link href="/forgot-password">
            <Button variant="primary" className="w-full">Request new link</Button>
          </Link>
          <Link
            href="/auth/email"
            className="block text-body text-white-800 hover:text-white-900"
          >
            Back to sign in
          </Link>
        </div>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer 
      title="Create new password"
      description={<>Create a new secure password for your account. <br />Make sure it's strong and memorable.</>}
    >
      <form
        onSubmit={handleSubmit(
          (data) => {
            console.log("Form submit handler called with data:", data);
            onSubmit(data);
          },
          (errors) => {
            console.log("Form validation errors:", errors);
          }
        )}
        className={`flex flex-col ${authFormGap}`}
      >
        <PasswordInput
          label="New password"
          {...register("password")}
          error={(errors.password?.message as string) || error || undefined}
          showRequirements={true}
          validationErrors={passwordValidation.errors}
          validationWarnings={passwordValidation.warnings}
          passwordValue={watchedPassword}
          floatingLabel={true}
        />

        <PasswordInput
          label="Confirm password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message as string}
          floatingLabel={true}
        />

        <Button type="submit" isLoading={isLoading} variant="primary" className="w-full">
          Update password
        </Button>
      </form>
    </AuthContainer>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <AuthContainer>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthContainer>
    }>
      <ResetPasswordPageForm />
    </Suspense>
  );
}
