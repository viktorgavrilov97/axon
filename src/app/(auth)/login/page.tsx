"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If there's an error parameter, redirect to error page
    const error = searchParams.get("error");
    if (error) {
      router.replace(`/auth/error?error=${encodeURIComponent(error)}`);
    } else {
      // Redirect to new email-first flow
      router.replace("/auth/email");
    }
  }, [router, searchParams]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
