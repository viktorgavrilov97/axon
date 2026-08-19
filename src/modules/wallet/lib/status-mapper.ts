// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

/**
 * Normalizes OxaPay payment status to one of the standard OxaPay statuses
 * 
 * OxaPay statuses:
 * - "paying": Payment is in progress, waiting for confirmation
 * - "paid": Payment completed and confirmed
 * - "expired": Payment expired
 * - "failed": Payment failed
 * - "cancelled": Payment cancelled
 * 
 * Transaction statuses (in txs array):
 * - "confirming": Transaction is being confirmed
 * - "confirmed": Transaction confirmed
 * 
 * @deprecated This function is kept for backward compatibility but is no longer needed
 * as we now store OxaPay statuses directly in the database.
 * Use the status from the database directly.
 */
export function mapOxaPayStatusToDepositStatus(
  status: string,
): OxaPayDepositStatus {
  const normalizedStatus = status.toLowerCase().trim();
  
  switch (normalizedStatus) {
    case "paying":
    case "processing":
    case "confirming":
      // Payment initiated but not yet confirmed
      return "paying";

    case "paid":
    case "completed":
    case "finished":
      // Payment completed and confirmed
      return "paid";

    case "expired":
      // Payment expired
      return "expired";

    case "failed":
      // Payment failed
      return "failed";

    case "cancelled":
    case "canceled":
      // Payment cancelled
      return "cancelled";

    default:
      // Unknown status - default to paying to be safe
      console.warn(`[StatusMapper] Unknown OxaPay status: "${status}", defaulting to paying`);
      return "paying";
  }
}

