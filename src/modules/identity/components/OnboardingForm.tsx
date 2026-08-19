"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/modules/identity/api/update-profile";
import { Button } from "@/shared/ui/button";
import { AuthContainer, authFormGap } from "@/shared/ui/auth/container";
import { Input } from "@/shared/ui/inputs";

interface OnboardingFormProps {
  initialDisplayName: string;
  hasReferralParent: boolean;
  referralParentCode: string | null;
  referralParentDisplayName: string | null;
}

export default function OnboardingForm({
  initialDisplayName,
  hasReferralParent,
  referralParentCode,
  referralParentDisplayName,
}: OnboardingFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  // Initialize referral code from props if available (from cookie or DB)
  const [referralCode, setReferralCode] = useState(referralParentCode || "");
  const [referralError, setReferralError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Set cursor to end of input when component mounts or when input gets focus
  useEffect(() => {
    if (inputRef.current && initialDisplayName) {
      const input = inputRef.current;
      // Small delay to ensure input is focused
      setTimeout(() => {
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }, 0);
    }
  }, [initialDisplayName]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target;
    const length = input.value.length;
    // Set cursor to end after a tiny delay to ensure it works
    setTimeout(() => {
      input.setSelectionRange(length, length);
    }, 0);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setReferralError(null);

    const formData = new FormData();
    formData.append("displayName", displayName);
    
    // Only add referral code if user doesn't have a parent and entered a code
    if (!hasReferralParent && referralCode.trim()) {
      formData.append("referralCode", referralCode.trim());
    }

    startTransition(async () => {
      const res = await updateProfileAction(formData);
      if (!res.ok) {
        if (res.error?.includes("referral") || res.error?.includes("Referral")) {
          setReferralError(res.error);
        } else {
          setError(res.error ?? "Something went wrong");
        }
        return;
      }
      router.replace("/terminal");
    });
  };

  return (
    <AuthContainer 
      title="Set up your profile"
      description={<>Adjust how your name will appear in the terminal. <br />You can change it later.</>}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          ref={inputRef}
          label="Display name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onFocus={handleFocus}
          disabled={isPending}
          error={error || undefined}
          floatingLabel={true}
          autoFocus
        />

        {/* Referral Code Input */}
        <Input
          label={hasReferralParent ? "Referral ID" : "Referral ID (optional)"}
          type="text"
          value={hasReferralParent ? (referralParentCode || "Loading...") : referralCode}
          onChange={(e) => {
            if (!hasReferralParent) {
              setReferralCode(e.target.value);
              setReferralError(null);
            }
          }}
          disabled={isPending || hasReferralParent}
          error={referralError || undefined}
          floatingLabel={true}
          className={hasReferralParent ? "opacity-60" : ""}
        />

        <Button
          type="submit"
          isLoading={isPending}
          disabled={!displayName.trim()}
          variant="primary"
          className="w-full mt-6"
        >
          Continue
        </Button>
      </form>
    </AuthContainer>
  );
}

