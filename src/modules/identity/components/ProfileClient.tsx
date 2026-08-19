"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { ArrowRight, LockKey, Tray, ShieldCheck } from "@phosphor-icons/react";
import {
  changePasswordSchema,
  changeEmailSchema,
  phoneSchema,
} from "@/shared/lib/validations";
import { z } from "zod";
import {
  changePasswordAction,
  changeEmailAction,
  verifyEmailChangeAction,
  updatePhoneAction,
  toggleTwoFactorAction,
  verifyTwoFactorAction,
} from "@/modules/identity/api/profile";
import { updateProfileAction } from "@/modules/identity/api/update-profile";
import { Input } from "@/shared/ui/inputs";
import { PasswordInput } from "@/shared/ui/inputs/password";
import { Button } from "@/shared/ui/button";
import { validatePasswordClient } from "@/shared/lib/password-validation";
import { UserAvatar } from "@/shared/ui/user-avatar";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { TelegramSection } from "@/modules/telegram/components/TelegramSection";
import { handleServerActionError } from "@/shared/lib/server-action-error-handler";

interface User {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  phone: string | null;
  isTwoFactorEnabled: boolean;
  isGoogleAccount: boolean;
  referralCode: string | null;
  telegramUserId?: string | null;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  telegramConnectedAt?: Date | null;
  telegramNotificationsEnabled?: boolean;
}

interface ProfileClientProps {
  user: User;
  onProfileUpdated?: () => void;
  onClose?: () => void;
  onTitleChange?: (title: string) => void;
  telegramEnabled?: boolean;
}

export function ProfileClient({ user: initialUser, onProfileUpdated, onClose, onTitleChange, telegramEnabled = false }: ProfileClientProps) {
  const [user, setUser] = useState<User>(initialUser);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [twoFactorVerificationPending, setTwoFactorVerificationPending] =
    useState(false);
  const [activeView, setActiveView] = useState<'main' | 'password' | 'email' | '2fa'>('main');
  const [newPasswordValidation, setNewPasswordValidation] = useState<{
    errors: string[];
    warnings: string[];
    isValid: boolean;
  }>({ errors: [], warnings: [], isValid: false });

  // Update modal title based on active view
  useEffect(() => {
    if (onTitleChange) {
      if (activeView === 'main') {
        onTitleChange('Profile');
      } else if (activeView === 'password') {
        onTitleChange('Change password');
      } else if (activeView === 'email') {
        onTitleChange('Change email');
      } else if (activeView === '2fa') {
        onTitleChange('Two-factor authentication');
      }
    }
  }, [activeView, onTitleChange]);
  
  // Profile update state
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [telegramUsername, setTelegramUsername] = useState(user.telegramUsername ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUpdatingProfile, startProfileUpdate] = useTransition();
  const avatarPreviewRef = useRef<string | null>(null);

  // Sync state when user prop changes
  useEffect(() => {
    setDisplayName(user.displayName ?? "");
    setTelegramUsername(user.telegramUsername ?? "");
  }, [user.displayName, user.telegramUsername]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current);
      }
    };
  }, []);

  const passwordForm = useForm<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>({
    resolver: zodResolver(changePasswordSchema),
  });

  const watchedNewPassword = passwordForm.watch("newPassword", "");

  // Update validation when new password changes
  useEffect(() => {
    if (watchedNewPassword) {
      const validation = validatePasswordClient(watchedNewPassword, user.email);
      setNewPasswordValidation(validation);
    } else {
      setNewPasswordValidation({ errors: [], warnings: [], isValid: false });
    }
  }, [watchedNewPassword, user.email]);

  const emailForm = useForm<{ newEmail: string }>({
    resolver: zodResolver(changeEmailSchema),
  });

  const phoneForm = useForm<{ phone?: string }>({
    resolver: zodResolver(z.object({ phone: phoneSchema })),
    defaultValues: { phone: user?.phone || "" },
  });

  const handleChangePassword = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("currentPassword", data.currentPassword);
    formData.append("newPassword", data.newPassword);
    formData.append("confirmPassword", data.confirmPassword);

    const result = await changePasswordAction(formData);

    if (result?.error) {
      toast.error(result.error);
      setError(result.error);
    } else {
      toast.success("Password successfully changed");
      passwordForm.reset();
    }
  };

  const handleChangeEmail = async (data: { newEmail: string }) => {
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("newEmail", data.newEmail);

    const result = await changeEmailAction(formData);

    if (result?.error) {
      toast.error(result.error);
      setError(result.error);
    } else if (result?.requiresVerification) {
      setEmailVerificationPending(true);
      setPendingEmail(result.email || null);
      toast.success(result.message || "Verification code sent");
    }
  };

  const handleVerifyEmailChange = async (code: string) => {
    if (!pendingEmail) return;

    setError(null);
    setSuccess(null);

    const result = await verifyEmailChangeAction(pendingEmail, code);

    if (result?.error) {
      toast.error(result.error);
      setError(result.error);
    } else {
      toast.success("Email successfully changed");
      setEmailVerificationPending(false);
      setPendingEmail(null);
      emailForm.reset();
      setUser({ ...user, email: pendingEmail });
    }
  };

  const handleUpdatePhone = async (data: { phone?: string }) => {
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("phone", data.phone || "");

    const result = await updatePhoneAction(formData);

    if (result?.error) {
      toast.error(result.error);
      setError(result.error);
    } else {
      toast.success("Phone number updated");
      setUser({ ...user, phone: data.phone || null });
    }
  };

  const handleToggleTwoFactor = async (enable: boolean) => {
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("enable", enable.toString());

    const result = await toggleTwoFactorAction(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.requiresVerification) {
      setTwoFactorVerificationPending(true);
      setSuccess(result.message || "Verification code sent");
    } else {
      setSuccess(enable ? "2FA enabled" : "2FA disabled");
      setUser({ ...user, isTwoFactorEnabled: enable });
    }
  };

  const handleVerifyTwoFactor = async (code: string) => {
    setError(null);
    setSuccess(null);

    const result = await verifyTwoFactorAction(code);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess("2FA successfully enabled");
      setTwoFactorVerificationPending(false);
      setUser({ ...user, isTwoFactorEnabled: true });
    }
  };

  // Reset view when going back
  const handleBack = () => {
    setActiveView('main');
    setError(null);
    setSuccess(null);
    setEmailVerificationPending(false);
    setPendingEmail(null);
    setTwoFactorVerificationPending(false);
    passwordForm.reset();
    emailForm.reset();
  };

  // Render second level views
  if (activeView !== 'main') {
    return (
      <div className="max-w-2xl">
        {activeView === '2fa' && error && (
          <div className="mb-4 py-4 px-5 border border-redhaze text-redhaze text-body rounded-full">
            {error}
          </div>
        )}

        {activeView === '2fa' && success && (
          <div className="mb-4 py-4 px-5 border border-mint text-mint text-body rounded-full">
            {success}
          </div>
        )}

        {activeView === 'password' && (
          <section>
            <form
              onSubmit={passwordForm.handleSubmit(handleChangePassword)}
              className="space-y-6"
            >
              <Input
                label="Current password"
                type="password"
                autoComplete="off"
                {...passwordForm.register("currentPassword")}
                error={
                  passwordForm.formState.errors.currentPassword?.message as string
                }
              />
              <PasswordInput
                label="New password"
                {...passwordForm.register("newPassword")}
                error={
                  passwordForm.formState.errors.newPassword?.message as string
                }
                showRequirements={true}
                validationErrors={newPasswordValidation.errors}
                validationWarnings={newPasswordValidation.warnings}
                passwordValue={watchedNewPassword}
                email={user.email}
              />
              <PasswordInput
                label="Confirm new password"
                {...passwordForm.register("confirmPassword")}
                error={
                  passwordForm.formState.errors.confirmPassword?.message as string
                }
              />
              <Button type="submit">Change password</Button>
            </form>
          </section>
        )}

        {activeView === 'email' && (
          <section>
            {emailVerificationPending && pendingEmail ? (
              <EmailVerificationForm
                email={pendingEmail}
                onVerify={handleVerifyEmailChange}
              />
            ) : (
              <form
                onSubmit={emailForm.handleSubmit(handleChangeEmail)}
                className="space-y-6"
              >
                <Input
                  label="New email"
                  type="email"
                  {...emailForm.register("newEmail")}
                  error={emailForm.formState.errors.newEmail?.message as string}
                />
                <Button type="submit">Change email</Button>
              </form>
            )}
          </section>
        )}

        {activeView === '2fa' && (
          <section>
            {twoFactorVerificationPending ? (
              <TwoFactorVerificationForm onVerify={handleVerifyTwoFactor} />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-start gap-4 mt-12 mb-4">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${
                      user.isTwoFactorEnabled
                        ? "bg-mint/20"
                        : "bg-white-600/20"
                    }`}
                  >
                    <ShieldCheck
                      size={24}
                      weight="regular"
                      className={
                        user.isTwoFactorEnabled
                          ? "text-mint"
                          : "text-white-600"
                      }
                    />
                  </div>
                  <div className="space-y-2">

                    <p className={`text-sm max-w-[80%] ${
                      user.isTwoFactorEnabled ? "text-mint" : "text-white-600"
                    }`}>
                      {user.isTwoFactorEnabled
                        ? "Your account is secured with two-factor authentication. Even if someone gets your password, they still can’t access your account."
                        : "Enable two-factor authentication to protect your account. It prevents unauthorized access even if your password is compromised."}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleToggleTwoFactor(!user.isTwoFactorEnabled)}
                >
                  {user.isTwoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-8">
        <section>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setSuccess(null);

              // Validate telegram username (only username, no links, no @)
              const telegramUsernameValue = telegramUsername.trim();
              if (telegramUsernameValue) {
                // Check if it contains URL patterns
                if (telegramUsernameValue.includes("http://") || 
                    telegramUsernameValue.includes("https://") ||
                    telegramUsernameValue.includes("t.me/") ||
                    telegramUsernameValue.includes("@")) {
                  setError("Telegram username should only contain the username without @ or links");
                  toast.error("Telegram username should only contain the username without @ or links");
                  return;
                }
                // Check if it contains only valid characters (letters, numbers, underscores)
                if (!/^[a-zA-Z0-9_]+$/.test(telegramUsernameValue)) {
                  setError("Telegram username can only contain letters, numbers, and underscores");
                  toast.error("Telegram username can only contain letters, numbers, and underscores");
                  return;
                }
              }

              // Check file size before sending (1 MB limit)
              if (avatarFile && avatarFile.size > 1024 * 1024) {
                setError("File size exceeds the limit of 1 MB. Please use a smaller file.");
                toast.error("File size exceeds the limit of 1 MB. Please use a smaller file.");
                return;
              }

              const formData = new FormData();
              formData.append("displayName", displayName);
              formData.append("telegramUsername", telegramUsernameValue);
              if (avatarFile) {
                formData.append("avatar", avatarFile);
              }

              startProfileUpdate(async () => {
                try {
                  const res = await updateProfileAction(formData);
                  if (!res.ok) {
                    setError(res.error ?? "Failed to update profile");
                    toast.error(res.error ?? "Failed to update profile");
                    return;
                  }
                
                // Clean up preview URL first
                if (avatarPreviewRef.current) {
                  URL.revokeObjectURL(avatarPreviewRef.current);
                  avatarPreviewRef.current = null;
                  setAvatarPreview(null);
                }
                
                // Update user state with new avatarUrl, displayName, and telegramUsername immediately
                if (res.avatarUrl !== undefined || res.displayName !== undefined || res.telegramUsername !== undefined) {
                  const updatedUser = {
                    ...user,
                    avatarUrl: res.avatarUrl ?? user.avatarUrl,
                    displayName: res.displayName ?? user.displayName,
                    telegramUsername: res.telegramUsername ?? user.telegramUsername,
                  };
                  setUser(updatedUser);
                  setTelegramUsername(updatedUser.telegramUsername ?? "");
                  
                  // Dispatch custom event to update sidebar
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('profile-updated', {
                      detail: updatedUser
                    }));
                  }
                }
                
                setAvatarFile(null);
                
                // Show toast notification
                if (avatarFile) {
                  toast.success("Avatar uploaded successfully");
                } else {
                  toast.success("Profile updated successfully");
                }
                
                // Notify parent component to reload data
                if (onProfileUpdated) {
                  onProfileUpdated();
                }
                } catch (error) {
                  const errorInfo = handleServerActionError(error);
                  setError(errorInfo.message);
                  toast.error(errorInfo.message);
                }
              });
            }}
            className="space-y-8"
          >
            {/* Avatar Section */}
            <div className="space-y-6 mt-8">
              <div className="flex items-start gap-6">
                {avatarPreview ? (
                  <div
                    className="relative rounded-full overflow-hidden"
                    style={{ width: 80, height: 80 }}
                  >
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <UserAvatar
                    user={{
                      id: user.id,
                      email: user.email,
                      name: user.name,
                      displayName: user.displayName,
                      avatarUrl: user.avatarUrl,
                      avatarColor: user.avatarColor,
                    }}
                    size={80}
                  />
                )}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUpdatingProfile}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setAvatarFile(file);
                        
                        // Cleanup previous preview
                        if (avatarPreviewRef.current) {
                          URL.revokeObjectURL(avatarPreviewRef.current);
                        }
                        
                        if (file) {
                          // Create preview URL
                          const previewUrl = URL.createObjectURL(file);
                          avatarPreviewRef.current = previewUrl;
                          setAvatarPreview(previewUrl);
                        } else {
                          avatarPreviewRef.current = null;
                          setAvatarPreview(null);
                        }
                      }}
                      id="avatar-upload"
                      className="hidden"
                    />
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        disabled={isUpdatingProfile}
                        className="pointer-events-none"
                      >
                        {avatarFile ? avatarFile.name : "Choose file"}
                      </Button>
                    </label>
                  </div>
                  <p className="text-small text-white-600 max-w-[90%]">
                    Recommended: square image, at least 256×256px. We'll optimize it automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Display Name Section */}
            <div className="space-y-3">
              <Input
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isUpdatingProfile}
                placeholder="Axon Trader"
              />
              <p className="text-small text-white-600 -mt-2">
                This name is shown in your terminal, referrals and operations.
              </p>
            </div>

            {/* Telegram Username Section */}
            <div className="space-y-3">
              <label className="block text-caption text-white-900 font-medium mb-3">
                Telegram
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-body text-white-600 pointer-events-none">@</span>
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => {
                    // Remove @ if user types it
                    const value = e.target.value.replace(/@/g, '');
                    setTelegramUsername(value);
                  }}
                  disabled={isUpdatingProfile}
                  placeholder="username"
                  className="w-full h-14 pl-8 pr-4 bg-transparent hover:bg-onsurface-950 border rounded-xl text-white-900 text-body placeholder:text-white-600 focus:outline-none focus:border-white-900 focus:shadow-[0_0_0_1px_rgba(255,255,255,1)] transition-all border-onsurface-800"
                />
              </div>
              <p className="text-small text-white-600 -mt-2">
                Enter your Telegram username without @ symbol.
              </p>
            </div>

            {!user.isGoogleAccount && (
              <div className="rounded-xl border border-onsurface-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActiveView('password')}
                  className="w-full text-left p-4 hover:bg-onsurface-900 transition-all cursor-pointer flex items-center justify-between gap-3 border-b border-onsurface-800 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <LockKey size={20} weight="regular" className="text-white-700 flex-shrink-0" />
                    <h2 className="text-sm">Change password</h2>
                  </div>
                  <ArrowRight size={16} weight="regular" className="text-white-700 flex-shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('email')}
                  className="w-full text-left p-4 hover:bg-onsurface-900 transition-all cursor-pointer flex items-center justify-between gap-3 border-b border-onsurface-800 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Tray size={20} weight="regular" className="text-white-700 flex-shrink-0" />
                    <h2 className="text-sm">Change email</h2>
                  </div>
                  <ArrowRight size={16} weight="regular" className="text-white-700 flex-shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('2fa')}
                  className="w-full text-left p-4 hover:bg-onsurface-900 transition-all cursor-pointer flex items-center justify-between gap-3 border-b border-onsurface-800 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} weight="regular" className="text-white-700 flex-shrink-0" />
                    <h2 className="text-body">Two-factor authentication</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-small text-white-600">
                      {user.isTwoFactorEnabled ? "on" : "off"}
                    </span>
                    <ArrowRight size={16} weight="regular" className="text-white-700 flex-shrink-0" />
                  </div>
                </button>
              </div>
            )}

            {/* Telegram Section */}
            {telegramEnabled && (
              <TelegramSection
                isEnabled={telegramEnabled}
                telegramChatId={user.telegramChatId || null}
                telegramUsername={user.telegramUsername || null}
                telegramNotificationsEnabled={user.telegramNotificationsEnabled ?? true}
                onUpdate={onProfileUpdated}
              />
            )}

            <Button 
              type="submit" 
              isLoading={isUpdatingProfile}
              variant="primary"
              className="w-full"
            >
              Save changes
            </Button>
          </form>
        </section>

      </div>
    </div>
  );
}

function EmailVerificationForm({
  email,
  onVerify,
}: {
  email: string;
  onVerify: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  return (
    <div className="space-y-6">
      <p className="text-body text-white-600">
        Enter the verification code sent to {email}
      </p>
      <Input
        label="Verification code"
        type="text"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="000000"
      />
      <Button onClick={() => onVerify(code)}>Verify</Button>
    </div>
  );
}

function TwoFactorVerificationForm({
  onVerify,
}: {
  onVerify: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  return (
    <div className="space-y-6">
      <p className="text-body text-white-600">
        Enter the verification code sent to your email
      </p>
      <Input
        label="Verification code"
        type="text"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="000000"
      />
      <Button onClick={() => onVerify(code)}>Verify</Button>
    </div>
  );
}


