"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordResetSchema } from "@/shared/lib/validations";
import { requestPasswordResetAction } from "@/modules/identity/api/forgot-password";
import { Input } from "@/shared/ui/inputs";
import { Button } from "@/shared/ui/button";
import { AuthContainer, authFormGap, authButtonsGap } from "@/shared/ui/auth/container";
import { AuthMessage } from "@/shared/ui/auth/message";
import Link from "next/link";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: {
      email: emailFromQuery,
    },
  });

  // Update email field when query param changes
  useEffect(() => {
    if (emailFromQuery) {
      setValue("email", emailFromQuery);
    }
  }, [emailFromQuery, setValue]);

  const onSubmit = async (data: { email: string }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("email", data.email);

    try {
      const result = await requestPasswordResetAction(formData);

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      } else if (result?.success && result?.email) {
        setSuccess(true);
        setSuccessEmail(result.email);
        setIsLoading(false);
      } else {
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Request password reset error:", error);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  if (success && successEmail) {
    return (
      <AuthContainer 
        title="Check your email"
        description={<>We've sent a password reset link to your email. <br />Please check your inbox and follow the instructions.</>}
      >
        <AuthMessage type="info">
          <p>
            We&apos;ve sent a password reset link to {successEmail}.
          </p>
        </AuthMessage>

        <div className="text-left">
          <Link
            href="/auth/email"
            className="text-body text-white-800 hover:text-white-900"
          >
            Back to sign in
          </Link>
        </div>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer 
      title="Reset password"
      description={<>Enter your email address and we'll send you <br />a link to reset your password.</>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className={`flex flex-col ${authFormGap}`}>
        <Input
          label="Email"
          type="email"
          {...register("email")}
          error={(errors.email?.message as string) || error || undefined}
          floatingLabel={true}
        />

        <Button type="submit" isLoading={isLoading} variant="primary" className="w-full">
          Send reset link
        </Button>
      </form>

      <div className={`text-left ${authButtonsGap}`}>
        <Link
          href="/auth/email"
          className="text-body text-white-800 hover:text-white-900"
        >
          Back to sign in
        </Link>
      </div>
    </AuthContainer>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <AuthContainer>
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthContainer>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}

