"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { UserAvatar } from "@/shared/ui/user-avatar";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { updateUserRoleAction } from "@/modules/admin/api/update-user-role";
import { getInvestorDataAction } from "@/modules/admin/api/get-investor-data";
import toast from "react-hot-toast";

interface User {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  createdAt: Date;
  lastLogin: Date | null;
}

interface InvestorDetailsModalProps {
  user: User;
  onClose: () => void;
  onRoleUpdated?: (userId: string, newRole: "USER" | "ADMIN" | "SUPERADMIN") => void;
}

const roleLabels: Record<"USER" | "ADMIN" | "SUPERADMIN", string> = {
  USER: "User",
  ADMIN: "Admin",
  SUPERADMIN: "Super Admin",
};

export function InvestorDetailsModal({ user, onClose, onRoleUpdated }: InvestorDetailsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<"USER" | "ADMIN" | "SUPERADMIN">(user.role);
  const userIdRef = useRef<string | null>(null);
  const [investorData, setInvestorData] = useState<{
    balance: number;
    kpis: {
      totalDeposits: number;
      totalWithdrawals: number;
      activeInvestments: number;
      totalStrategyProfit: number;
      returnedPrincipal: number;
      referralTurnover: number;
      referralPayouts: number;
      totalReferrals: number;
    };
  } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Only sync selectedRole when a DIFFERENT user is opened (user.id changes)
  // NEVER sync when user.role changes - this would overwrite user's selection
  useEffect(() => {
    console.log("[InvestorDetailsModal] useEffect triggered", { 
      currentUserId: userIdRef.current, 
      newUserId: user.id,
      isDifferent: userIdRef.current !== user.id 
    });
    
    // Always fetch data on mount or when user changes
    const fetchData = async () => {
      setIsLoadingData(true);
      console.log("[InvestorDetailsModal] Fetching data for user:", user.id);
      
      try {
        const result = await getInvestorDataAction(user.id);
        console.log("[InvestorDetailsModal] Received result:", result);
        
        if (result?.success) {
          setInvestorData({
            balance: result.balance,
            kpis: result.kpis,
          });
          console.log("[InvestorDetailsModal] Data set successfully");
        } else {
          console.error("[InvestorDetailsModal] Failed to load investor data:", result?.error);
          toast.error(result?.error || "Failed to load investor data");
        }
      } catch (error) {
        console.error("[InvestorDetailsModal] Error loading investor data:", error);
        toast.error("Failed to load investor data");
      } finally {
        console.log("[InvestorDetailsModal] Setting isLoadingData to false");
        setIsLoadingData(false);
      }
    };

    // Only update if it's a completely different user
    if (userIdRef.current !== user.id) {
      userIdRef.current = user.id;
      setSelectedRole(user.role);
      fetchData();
    } else if (userIdRef.current === null || userIdRef.current === undefined) {
      // Initial load
      userIdRef.current = user.id;
      setSelectedRole(user.role);
      fetchData();
    }
    // Intentionally NOT syncing when user.role changes - user controls selectedRole
  }, [user.id]); // Only depend on user.id, NOT user.role

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleRoleChange = (newRole: "USER" | "ADMIN" | "SUPERADMIN") => {
    if (newRole === selectedRole) {
      return;
    }

    // Find current role for rollback on error
    const oldRole = selectedRole;

    // Optimistic update - update UI immediately
    setSelectedRole(newRole);
    onRoleUpdated?.(user.id, newRole);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("userId", user.id);
      formData.append("role", newRole);

      const result = await updateUserRoleAction(formData);

      if (result?.error) {
        toast.error(result.error);
        // Rollback on error
        setSelectedRole(oldRole);
        onRoleUpdated?.(user.id, oldRole);
      } else if (result?.success) {
        toast.success("Role successfully updated");
      }
    });
  };

  return (
    <div
      className={MODAL_STYLES.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={MODAL_STYLES.content}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 className={MODAL_STYLES.title}>Investor Details</h2>
          
          {/* User */}
          <div className="flex items-center gap-3 mt-4">
            <UserAvatar
              user={{
                id: user.id,
                email: user.email,
                name: user.name,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                avatarColor: user.avatarColor,
              }}
              size={24}
            />
            <div className="flex flex-col">
              <p className="text-[14px] text-white-900">
                {getUserDisplayName(user)}
              </p>
              <p className="text-[12px] text-white-600">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Role */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Role</p>
            <p className="text-[14px] text-white-900">
              {roleLabels[selectedRole]}
            </p>
          </div>

          {/* Registered */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Registered</p>
            <p className="text-[14px] text-white-900">
              {formatDate(user.createdAt)}
            </p>
          </div>

          {/* Last Login */}
          {user.lastLogin && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Last Login</p>
              <p className="text-[14px] text-white-900">
                {formatDate(user.lastLogin)}
              </p>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-onsurface-950 mt-6"></div>

        {/* Investor Overview KPIs */}
        {isLoadingData ? (
          <div className="mt-6">
            <p className="text-small text-white-600">Loading investor data...</p>
          </div>
        ) : investorData ? (
          <div className="mt-6">
            <div className="border-t border-onsurface-950 pt-6">
              <p className="text-small text-white-600 mb-4">Investor Overview</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-white-600 mb-1">Total Deposits</p>
                  <p className="text-sm text-white-900">{investorData.kpis.totalDeposits.toFixed(2)} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-white-600 mb-1">Total Withdrawals</p>
                  <p className="text-sm text-white-900">{investorData.kpis.totalWithdrawals.toFixed(2)} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-white-600 mb-1">Active Investments</p>
                  <p className="text-sm text-white-900">{investorData.kpis.activeInvestments.toFixed(2)} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-white-600 mb-1">Strategy Profit</p>
                  <p className="text-sm text-white-900">{investorData.kpis.totalStrategyProfit.toFixed(2)} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-white-600 mb-1">Returned Principal</p>
                  <p className="text-sm text-white-900">{investorData.kpis.returnedPrincipal.toFixed(2)} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-white-600 mb-1">Referral Turnover</p>
                  <p className="text-sm text-white-900">{investorData.kpis.referralTurnover.toFixed(2)} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-white-600 mb-1">Referral Payouts</p>
                  <p className="text-sm text-white-900">{investorData.kpis.referralPayouts.toFixed(2)} USDT</p>
                </div>
                <div>
                  <p className="text-xs text-white-600 mb-1">Total Referrals</p>
                  <p className="text-sm text-white-900">{investorData.kpis.totalReferrals}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Separator */}
        <div className="border-t border-onsurface-950 mt-6"></div>

        {/* Change Role */}
        <div className="mt-6">
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Change role</p>
            <select
              value={selectedRole}
              onChange={(e) => {
                const newRole = e.target.value as "USER" | "ADMIN" | "SUPERADMIN";
                handleRoleChange(newRole);
              }}
              disabled={isPending}
              className="bg-onsurface-900 text-white-900 text-body px-3 py-2 rounded border border-white-500 focus:outline-none focus:border-white-900 disabled:opacity-50"
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPERADMIN">Super Admin</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

