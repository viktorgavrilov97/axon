"use client";

import { getStatusText, type OperationStatus } from "@/modules/operations/lib/status-utils";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: "deposit" | "withdrawal";
  userEmail: string;
  amount: number;
  status: string;
  createdAt: Date;
}

interface RecentActivityClientProps {
  activities: ActivityItem[];
}

export function RecentActivityClient({ activities }: RecentActivityClientProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const statusText = getStatusText(status as OperationStatus);
    const statusConfig =
      status === "paid" || status === "COMPLETED"
        ? { bg: "bg-[#A5EACF]/10", text: "text-[#A5EACF]" }
        : status === "paying" || status === "PENDING" || status === "APPROVED" || status === "PROCESSING"
        ? { bg: "bg-[#F4D48C]/10", text: "text-[#F4D48C]" }
        : status === "failed" || status === "expired" || status === "cancelled" || status === "REJECTED"
        ? { bg: "bg-[#F2A8A8]/10", text: "text-[#F2A8A8]" }
        : { bg: "bg-[#A8CFFF]/10", text: "text-[#A8CFFF]" };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-small ${statusConfig.bg} ${statusConfig.text}`}>
        {statusText}
      </span>
    );
  };

  return (
    <div className="bg-onsurface-900 p-6 rounded-xl">
      <h2 className="text-heading text-white-900 mb-4">Recent activity</h2>
      {activities.length === 0 ? (
        <p className="text-body text-white-600">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const href = activity.type === "deposit" 
              ? `/admin/deposits?depositId=${activity.id}`
              : `/admin/withdrawals?withdrawalId=${activity.id}`;
            
            return (
              <Link
                key={`${activity.type}-${activity.id}`}
                href={href}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-onsurface-950 cursor-pointer transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === "deposit" ? "bg-[#A5EACF]/10" : "bg-[#F4D48C]/10"
                }`}>
                  {activity.type === "deposit" ? (
                    <ArrowDown size={16} weight="regular" className="text-[#A5EACF]" />
                  ) : (
                    <ArrowUp size={16} weight="regular" className="text-[#F4D48C]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body text-white-900 truncate">
                    {activity.type === "deposit" ? "Deposit" : "Withdrawal"}
                  </p>
                  <p className="text-small text-white-600 truncate">{activity.userEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-body text-white-900 font-medium">
                    {activity.amount.toFixed(2)} USDT
                  </p>
                </div>
                <div>{getStatusBadge(activity.status)}</div>
                <div className="text-small text-white-600 whitespace-nowrap">
                  {formatDate(activity.createdAt)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

