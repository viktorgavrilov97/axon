"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterPageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to new email-first flow, preserving ref parameter
    const ref = searchParams.get("ref");
    const queryParams = new URLSearchParams();
    if (ref) {
      queryParams.set("ref", ref);
    }
    const queryString = queryParams.toString();
    router.replace(`/auth/email${queryString ? `?${queryString}` : ""}`);
  }, [router, searchParams]);

  return null;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageForm />
    </Suspense>
  );
}
