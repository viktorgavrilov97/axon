"use client";

import { useState } from "react";
import { UserAvatar } from "@/shared/ui/user-avatar";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { InvestorDetailsModal } from "./InvestorDetailsModal";

interface Investor {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  role: "USER" | "ADMIN" | "SUPERADMIN";
  createdAt: Date;
  lastLogin: Date | null;
  balance?: number;
}

interface InvestorsTableProps {
  initialInvestors: Investor[];
}

const roleLabels: Record<"USER" | "ADMIN" | "SUPERADMIN", string> = {
  USER: "User",
  ADMIN: "Admin",
  SUPERADMIN: "Super Admin",
};

function InvestorItem({ 
  investor, 
  onDetailsClick
}: { 
  investor: Investor; 
  onDetailsClick: (investor: Investor) => void;
}) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <tr 
      className="bg-onsurface-900 hover:bg-onsurface-800 transition-all duration-200 cursor-pointer group rounded-xl"
      onClick={() => onDetailsClick(investor)}
    >
      <td className="py-5 px-5 rounded-l-xl group-hover:px-6 transition-all duration-200 overflow-hidden">
        <div className="flex items-center gap-3">
          <UserAvatar
            user={{
              id: investor.id,
              email: investor.email,
              name: investor.name,
              displayName: investor.displayName,
              avatarUrl: investor.avatarUrl,
              avatarColor: investor.avatarColor,
            }}
            size={24}
          />
            <span className="text-body text-white-900">
              {getUserDisplayName(investor)}
            </span>
          </div>
      </td>
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-600">{investor.email}</span>
      </td>
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-900">
          {roleLabels[investor.role]}
        </span>
      </td>
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-700 whitespace-nowrap">
        {formatDate(investor.createdAt)}
        </span>
      </td>
      <td className="py-5 px-5 rounded-r-xl group-hover:px-6 text-right transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-900">
          {investor.balance !== undefined ? `${investor.balance.toFixed(2)} USDT` : "-"}
        </span>
      </td>
    </tr>
  );
}

export function InvestorsTable({ initialInvestors }: InvestorsTableProps) {
  const [investors, setInvestors] = useState<Investor[]>(initialInvestors);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);

  const handleRoleUpdated = (investorId: string, newRole: "USER" | "ADMIN" | "SUPERADMIN") => {
        setInvestors((prev) =>
          prev.map((u) => (u.id === investorId ? { ...u, role: newRole } : u))
        );
  };

  return (
    <div>
      <div className="rounded-xl overflow-hidden">
        {investors.length === 0 ? (
          <div className="p-8">
            <p className="text-body text-white-600 text-center">
              No investors yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate" style={{ borderSpacing: '0 12px' }}>
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[25%]" />
                <col className="w-[15%]" />
                <col className="w-[20%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Investor</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Email</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Role</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Registered</th>
                  <th className="text-right text-small text-white-700 pb-4 pr-0">Balance</th>
                </tr>
              </thead>
              <tbody>
                {investors.map((investor) => (
                  <InvestorItem
                    key={investor.id}
                    investor={investor}
                    onDetailsClick={setSelectedInvestor}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInvestor && (
        <InvestorDetailsModal
          user={selectedInvestor}
          onClose={() => setSelectedInvestor(null)}
          onRoleUpdated={handleRoleUpdated}
        />
      )}
    </div>
  );
}

