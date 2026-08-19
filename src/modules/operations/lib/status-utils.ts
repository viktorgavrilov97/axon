import { WithdrawalStatus } from "@prisma/client";

// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

export type OperationStatus = OxaPayDepositStatus | WithdrawalStatus;

/**
 * Get English text for status (OxaPay statuses for deposits)
 */
export function getStatusText(status: OperationStatus): string {
  switch (status) {
    // OxaPay deposit statuses
    case "paying":
      return "Awaiting payment";
    case "paid":
      return "Completed";
    case "expired":
      return "Expired";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    // Withdrawal statuses
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "COMPLETED":
      return "Completed";
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    default:
      return String(status);
  }
}

/**
 * Get status color class (OxaPay statuses for deposits)
 */
export function getStatusColor(status: OperationStatus): string {
  switch (status) {
    // OxaPay deposit statuses
    case "paid":
    case "COMPLETED":
      return "text-mint";
    case "paying":
    case "APPROVED":
    case "PENDING":
    case "PROCESSING":
      return "text-yellow-500";
    case "expired":
      return "text-white-600";
    case "cancelled":
      return "text-[#F2A8A8]";
    case "failed":
    case "REJECTED":
      return "text-redhaze";
    default:
      return "text-white-600";
  }
}

/**
 * Get status background color class (OxaPay statuses for deposits)
 */
export function getStatusBgColor(status: OperationStatus): string {
  switch (status) {
    // OxaPay deposit statuses
    case "paid":
    case "COMPLETED":
      return "bg-mint bg-opacity-10 border-mint";
    case "paying":
    case "APPROVED":
    case "PENDING":
    case "PROCESSING":
      return "bg-yellow-500 bg-opacity-10 border-yellow-500";
    case "expired":
    case "cancelled":
      return "bg-surface-800 border-white-500";
    case "failed":
    case "REJECTED":
      return "bg-redhaze bg-opacity-10 border-redhaze";
    default:
      return "bg-surface-800 border-white-500";
  }
}
