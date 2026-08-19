"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/shared/ui/modal";
import { ProfileClient } from "./ProfileClient";
import { getProfileDataAction } from "../api/get-profile-data";
import { Spinner } from "@/shared/ui/spinner";

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

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('Profile');
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  const loadUserData = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getProfileDataAction();
    if (result.ok && result.user) {
      setUser(result.user);
      setTelegramEnabled(result.telegramEnabled ?? false);
    } else {
      setError(result.error ?? "Failed to load profile data");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    loadUserData();
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" className="border-white-900" />
        </div>
      ) : error ? (
        <div className="p-4 bg-onsurface-900 border border-redhaze text-redhaze text-body rounded">
          {error}
        </div>
      ) : user ? (
        <ProfileClient 
          user={user} 
          onProfileUpdated={loadUserData} 
          onClose={onClose} 
          onTitleChange={setModalTitle}
          telegramEnabled={telegramEnabled}
        />
      ) : null}
    </Modal>
  );
}

