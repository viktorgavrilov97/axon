"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { createDepositAction } from "../api/create-deposit";
import { getActiveDepositAction } from "../api/get-active-deposit";
import { cancelDepositAction } from "../api/cancel-deposit";
import { syncDepositStatusAction } from "../api/sync-deposit-status";
import { useRealtime } from "@/shared/lib/realtime-context";
import { Input } from "@/shared/ui/inputs";
import { Button } from "@/shared/ui/button";
import { NetworkSelect } from "@/shared/ui/network-select";
import { CurrencySelect } from "@/shared/ui/currency-select";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { getStatusText, getStatusColor, getStatusBgColor, type OperationStatus } from "@/modules/operations/lib/status-utils";
import { NETWORKS, type NetworkType } from "@/modules/wallet/lib/network-types";
import { getDefaultNetworkForCurrency, getSupportedNetworksForCurrency, getMinAmountForCurrency } from "../lib/currencies";
import { getExchangeRateFromExternal } from "../lib/exchange-rate-client";
import Image from "next/image";
import { Spinner } from "@/shared/ui/spinner";
import { handleServerActionError } from "@/shared/lib/server-action-error-handler";

// NetworkIcon component from network-select for consistency
function NetworkIcon({ src, alt, size = 20 }: { src: string; alt: string; size?: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex-shrink-0 relative" style={{ width: size, height: size }}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-onsurface-800 rounded animate-skeleton-shimmer"
          style={{ width: size, height: size }}
        />
      )}
      {!hasError && (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
      {hasError && (
        <div 
          className="w-full h-full bg-onsurface-800 rounded flex items-center justify-center"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}

interface TopUpDialogProps {
  onClose: () => void;
  depositId?: string; // Optional: if provided, will load this specific deposit
}

interface ActiveDeposit {
  id: string;
  amountUsdt: number;
  payAmount: number;
  payCurrency: string;
  address: string | null;
  createdAt: Date;
  expirationTime: Date;
  status: string;
  qrCode?: string | null;
  network?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;
  txStatus?: string | null;
}

export function TopUpDialog({ onClose, depositId }: TopUpDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<"check" | "input" | "payment">("check");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingActiveDeposit, setIsCheckingActiveDeposit] = useState(true);
  const [minAmount] = useState<number>(1); // MIN_DEPOSIT_USDT
  const [isLoadingMinAmount] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<ActiveDeposit | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [paymentData, setPaymentData] = useState<{
    payAddress: string;
    payAmount: number;
    payCurrency: string;
    depositId: string;
    qrCode?: string;
    network?: string;
  } | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to realtime updates via shared context (single SSE connection)
  const { lastUpdate } = useRealtime();

  // Handle ESC key press and body scale/blur
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Add modal-open class to html and body for backdrop effect
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Helper function to extract currency code from payCurrency (e.g., "DOGE" from "DOGE" or "usdttrc20" -> "USDT")
  const extractCurrencyCode = (payCurrency: string | null | undefined): string => {
    if (!payCurrency) return "USDT";
    const currencyUpper = payCurrency.toUpperCase();
    
    // If it's a simple currency code (DOGE, BTC, etc.), return it
    const simpleCurrencies = ["BTC", "ETH", "DOGE", "LTC", "BCH", "XRP", "XMR", "SOL", "TRX", "MATIC", "TON", "BNB", "USDC", "DAI", "SHIB", "DOGS"];
    if (simpleCurrencies.includes(currencyUpper)) {
      return currencyUpper;
    }
    
    // If it contains USDT with network (usdttrc20, usdtmatic, etc.), return USDT
    if (currencyUpper.includes("USDT")) {
      return "USDT";
    }
    
    // Try to extract currency code by removing network suffixes
    const cleaned = currencyUpper
      .replace(/USDT|TRC20|ERC20|BEP20|POLYGON|SOLANA|TON|MATIC/gi, "")
      .trim();
    
    return cleaned || "USDT";
  };

  // Helper function to get network display name from currency
  const getNetworkDisplayNameFromCurrency = (currency: string | null | undefined): string | null => {
    if (!currency) return null;
    const currencyUpper = currency.toUpperCase();
    
    // Map currency codes to network display names
    const currencyNetworkMap: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      DOGE: "Dogecoin",
      LTC: "Litecoin",
      BCH: "Bitcoin Cash",
      XRP: "Ripple",
      XMR: "Monero",
      SOL: "Solana",
      TRX: "Tron",
      MATIC: "Polygon",
      TON: "TON",
      BNB: "BNB Chain",
      USDT: "TRC-20 (Tron)", // Default for USDT
      USDC: "ERC-20 (Ethereum)", // Default for USDC
    };
    
    // First try direct match
    if (currencyNetworkMap[currencyUpper]) {
      return currencyNetworkMap[currencyUpper];
    }
    
    // Fallback: try to infer from currency string
    const currencyLower = currency.toLowerCase();
    if (currencyLower.includes("doge")) {
      return "Dogecoin";
    } else if (currencyLower.includes("bitcoin") && !currencyLower.includes("cash")) {
      return "Bitcoin";
    } else if (currencyLower.includes("litecoin")) {
      return "Litecoin";
    } else if (currencyLower.includes("ripple") || currencyLower.includes("xrp")) {
      return "Ripple";
    } else if (currencyLower.includes("monero") || currencyLower.includes("xmr")) {
      return "Monero";
    } else if (currencyLower.includes("matic") || currencyLower.includes("polygon")) {
      return "Polygon";
    } else if (currencyLower.includes("trc20") || currencyLower.includes("tron")) {
      return "TRC-20 (Tron)";
    } else if (currencyLower.includes("erc20") || currencyLower.includes("ethereum")) {
      return "ERC-20 (Ethereum)";
    } else if (currencyLower.includes("bep20") || currencyLower.includes("bsc") || currencyLower.includes("bnb")) {
      return "BEP-20 (BNB Chain)";
    } else if (currencyLower.includes("solana") || currencyLower.includes("sol")) {
      return "Solana";
    } else if (currencyLower.includes("ton")) {
      return "TON";
    }
    
    return null;
  };

  // Helper function to infer network from payCurrency (for compatibility)
  const inferNetworkFromCurrency = (currency: string | null | undefined): NetworkType | null => {
    if (!currency) return null;
    const currencyLower = currency.toLowerCase();
    if (currencyLower.includes("matic") || currencyLower.includes("polygon")) {
      return "MATIC";
    } else if (currencyLower.includes("trc20") || currencyLower.includes("tron")) {
      return "TRC20";
    } else if (currencyLower.includes("erc20") || currencyLower.includes("ethereum")) {
      return "ERC20";
    } else if (currencyLower.includes("bep20") || currencyLower.includes("bsc") || currencyLower.includes("bnb")) {
      return "BEP20";
    } else if (currencyLower.includes("solana") || currencyLower.includes("sol")) {
      return "SOLANA";
    } else if (currencyLower.includes("ton")) {
      return "TON";
    }
    return null;
  };

  // Check for active deposit on mount (only if no paymentData)
  useEffect(() => {
    // Don't check if we already have paymentData (newly created deposit)
    if (paymentData) {
      setIsCheckingActiveDeposit(false);
      return;
    }
    
    const checkActiveDeposit = async () => {
      setIsCheckingActiveDeposit(true);
      try {
        const result = await getActiveDepositAction();
        if (result?.success) {
          if (result.deposit) {
            setActiveDeposit(result.deposit);
            // Set paymentData from activeDeposit to ensure network is available
            const inferredNetwork = inferNetworkFromCurrency(result.deposit.payCurrency);
            setPaymentData({
              payAddress: result.deposit.address || "",
              payAmount: result.deposit.payAmount,
              payCurrency: result.deposit.payCurrency,
              depositId: result.deposit.id,
              qrCode: result.deposit.qrCode || undefined,
              network: inferredNetwork || undefined,
            });
            setStep("payment");
          } else {
            setStep("input");
          }
        } else {
          setStep("input");
        }
      } catch (error) {
        console.error("Check active deposit error:", error);
        setStep("input");
      } finally {
        setIsCheckingActiveDeposit(false);
      }
    };

    checkActiveDeposit();
  }, [paymentData]);

  // Update active deposit when realtime update is received
  // Realtime updates trigger router.refresh() automatically (debounced)
  // We check active deposit to get latest status and confirmations
  useEffect(() => {
    if (!lastUpdate || step !== "payment") return;

    // When realtime update is received, check active deposit to get latest status
    // This updates both newly created deposits (paymentData) and existing deposits
    // Router refresh will happen automatically via RealtimeProvider
    const checkActiveDeposit = async () => {
      try {
        const result = await getActiveDepositAction();
        if (result?.success && result.deposit) {
          const deposit = result.deposit;
          const previousStatus = activeDeposit?.status;
          setActiveDeposit(deposit);
          
          // Show toast when deposit status changes to "paid"
          if (previousStatus === "paying" && deposit.status === "paid") {
            toast.success("Top-up paid successfully. Balance credited.");
            // Close modal after successful payment
            setTimeout(() => {
              onClose();
            }, 1500);
            return;
          }
          
          if (deposit.status === "paying") {
            try {
              const syncResult = await syncDepositStatusAction(deposit.id);
              const updatedResult = await getActiveDepositAction();
              if (updatedResult?.success && updatedResult.deposit) {
                setActiveDeposit(updatedResult.deposit);
                if (updatedResult.deposit.status === "paid") {
                  toast.success("Top-up confirmed. Balance credited.");
                  setTimeout(() => {
                    onClose();
                  }, 1500);
                  return;
                }
              } else if (syncResult?.balanceCredited) {
                toast.success("Top-up confirmed. Balance credited.");
                setTimeout(() => {
                  onClose();
                }, 1500);
                return;
              }
            } catch (error) {
              console.error("Error syncing deposit status:", error);
            }
          }
        } else if (result?.success && !result.deposit) {
          // Deposit was completed or cancelled - close modal
          setActiveDeposit(null);
          if (paymentData) {
            setPaymentData(null);
          }
          // Close modal instead of resetting to input step
          onClose();
        }
      } catch (error) {
        console.error("Check active deposit error:", error);
      }
    };

    checkActiveDeposit();
  }, [lastUpdate, step, paymentData, activeDeposit?.status, onClose]);

  // Periodic check for confirmations and sync status when reached
  useEffect(() => {
    if (!activeDeposit || activeDeposit.status !== "paying" || step !== "payment") return;

    const interval = setInterval(async () => {
      try {
        const result = await getActiveDepositAction();
        if (result?.success && result.deposit) {
          const deposit = result.deposit;
          const previousStatus = activeDeposit?.status;
          setActiveDeposit(deposit);
          
          // Show toast when deposit status changes to "paid"
          if (previousStatus === "paying" && deposit.status === "paid") {
            clearInterval(interval);
            toast.success("Top-up paid successfully. Balance credited.");
            // Close modal after successful payment
            setTimeout(() => {
              onClose();
            }, 1500);
            return;
          }
          
          if (deposit.status === "paying") {
            try {
              const syncResult = await syncDepositStatusAction(deposit.id);
              const updatedResult = await getActiveDepositAction();
              if (updatedResult?.success && updatedResult.deposit) {
                setActiveDeposit(updatedResult.deposit);
                if (updatedResult.deposit.status === "paid") {
                  clearInterval(interval);
                  toast.success("Top-up confirmed. Balance credited.");
                  setTimeout(() => {
                    onClose();
                  }, 1500);
                  return;
                }
              } else if (syncResult?.balanceCredited) {
                clearInterval(interval);
                toast.success("Top-up confirmed. Balance credited.");
                setTimeout(() => {
                  onClose();
                }, 1500);
                return;
              }
            } catch (error) {
              console.error("Error syncing deposit status:", error);
              toast.error("Failed to sync deposit status");
            }
          }
        } else if (result?.success && !result.deposit) {
          // Deposit was completed - close modal
          clearInterval(interval);
          setActiveDeposit(null);
          if (paymentData) {
            setPaymentData(null);
          }
          onClose();
        }
      } catch (error) {
        console.error("Error checking active deposit for confirmations:", error);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [activeDeposit?.id, activeDeposit?.status, step, paymentData, onClose]);

  // Timer for active deposit (only for PENDING/PROCESSING status)
  useEffect(() => {
    if (!activeDeposit) {
      setTimeLeft("");
      return;
    }

    // Stop timer if deposit is not PENDING or PROCESSING
    if (activeDeposit.status !== "paying") {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiration = new Date(activeDeposit.expirationTime);
      const diff = expiration.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeDeposit]);

  // Currency and exchange rate state
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USDT");
  const [fromAmount, setFromAmount] = useState<number | undefined>(undefined);
  const [toAmount, setToAmount] = useState<number | undefined>(undefined);
  const [toAmountInput, setToAmountInput] = useState<string>(""); // String value for input
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<"from" | "to" | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkType>("TRC20");
  const reverseCalculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get minimum amount based on currency
  const minAmountForCurrency = getMinAmountForCurrency(selectedCurrency);
  const minAmountUsdt = minAmount; // Minimum in USDT

  // Create schema: validate based on currency
  const topUpSchema = z.object({
    amount: z
      .number({
        message: "Enter amount",
      })
      .min(selectedCurrency === "USDT" ? minAmountUsdt : minAmountForCurrency, 
        `Minimum amount: ${selectedCurrency === "USDT" ? minAmountUsdt : minAmountForCurrency} ${selectedCurrency}`)
      .refine((val) => !isNaN(val), {
        message: "Enter a valid number",
      }),
    network: z.enum(["TRC20", "ERC20", "BEP20", "SOLANA", "MATIC", "TON"], {
      message: "Select network",
      }),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<{ amount: number; network: "TRC20" | "ERC20" | "BEP20" | "SOLANA" | "MATIC" | "TON" }>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amount: undefined,
      network: "TRC20",
    },
  });

  // Update network when currency changes (after useForm is initialized)
  useEffect(() => {
    const defaultNetwork = getDefaultNetworkForCurrency(selectedCurrency);
    const supportedNetworks = getSupportedNetworksForCurrency(selectedCurrency);
    
    // Map OxaPay network format to our NetworkType
    let mappedNetwork: NetworkType = "TRC20";
    if (defaultNetwork === "BITCOIN") {
      // BTC doesn't have a network select, it's always Bitcoin
      mappedNetwork = "TRC20"; // Placeholder, will be handled in API
    } else if (defaultNetwork === "ERC20") {
      mappedNetwork = "ERC20";
    } else if (defaultNetwork === "BEP20") {
      mappedNetwork = "BEP20";
    } else if (defaultNetwork === "SOLANA") {
      mappedNetwork = "SOLANA";
    } else if (defaultNetwork === "POLYGON") {
      mappedNetwork = "MATIC";
    } else if (defaultNetwork === "TON") {
      mappedNetwork = "TON";
    } else {
      mappedNetwork = "TRC20";
    }
    
    setSelectedNetwork(mappedNetwork);
    setValue("network", mappedNetwork);
  }, [selectedCurrency, setValue]);

  // Fetch exchange rate when currency or fromAmount changes (only for non-USDT currencies)
  // Forward calculation: from -> to
  useEffect(() => {
    console.log("[TopUpDialog] Exchange rate effect triggered:", { selectedCurrency, fromAmount, lastEditedField });
    
    if (selectedCurrency === "USDT") {
      // For USDT, no conversion needed - amount stays the same
      setExchangeRate(null);
      if (fromAmount !== undefined && fromAmount > 0) {
        setToAmount(fromAmount);
        setToAmountInput(fromAmount.toFixed(2));
      } else {
        setToAmount(undefined);
        setToAmountInput("");
      }
      return;
    }

    // Only handle forward calculation (from -> to), not reverse
    // Reverse calculation is handled in onChange handler with debounce
    if (lastEditedField === "to") {
      console.log("[TopUpDialog] User edited 'to' field, skipping forward calculation");
      return;
    }

    // Handle forward calculation: user edited "from" field or initial load
    if (fromAmount === undefined || fromAmount <= 0 || isNaN(fromAmount)) {
      console.log("[TopUpDialog] Invalid fromAmount, clearing toAmount");
      setToAmount(undefined);
      setToAmountInput("");
      setExchangeRate(null);
      return;
    }

    console.log("[TopUpDialog] Fetching exchange rate for forward calculation:", { selectedCurrency, fromAmount });

    const fetchRate = async () => {
      setIsLoadingRate(true);
      try {
        console.log("[TopUpDialog] Calling getExchangeRateFromExternal...");
        const rate = await getExchangeRateFromExternal(selectedCurrency, "USDT");
        console.log("[TopUpDialog] Exchange rate received:", rate);
        
        if (rate !== null && !isNaN(rate) && rate > 0) {
          setExchangeRate(rate);
          // Only recalculate toAmount if "from" field was edited
          if (lastEditedField === "from" || lastEditedField === null) {
            const calculatedAmount = fromAmount * rate;
            console.log("[TopUpDialog] Calculated toAmount:", calculatedAmount);
            setToAmount(calculatedAmount);
            setToAmountInput(calculatedAmount.toFixed(2));
          }
        } else {
          console.warn("[TopUpDialog] Invalid rate received:", rate);
          setExchangeRate(null);
          setToAmount(undefined);
          setToAmountInput("");
        }
      } catch (error) {
        console.error("[TopUpDialog] Error fetching exchange rate:", error);
        setExchangeRate(null);
        setToAmount(undefined);
        setToAmountInput("");
      } finally {
        setIsLoadingRate(false);
      }
    };

    fetchRate();
  }, [selectedCurrency, fromAmount, lastEditedField]);

  // Separate effect to handle reverse calculation when exchange rate is loaded and toAmount changes
  // This only runs when we need to fetch the rate for reverse calculation
  useEffect(() => {
    // Only handle reverse calculation if user edited "to" field and we don't have a rate yet
    if (lastEditedField !== "to" || !toAmount || toAmount <= 0 || selectedCurrency === "USDT") {
      return;
    }

    // If we already have a rate, skip (calculation is done in onChange)
    if (exchangeRate !== null && exchangeRate > 0) {
      return;
    }

    // Fetch rate for reverse calculation with debounce
    console.log("[TopUpDialog] Fetching rate for reverse calculation:", { selectedCurrency, toAmount });
    
    // Clear previous timeout
    if (reverseCalculationTimeoutRef.current) {
      clearTimeout(reverseCalculationTimeoutRef.current);
    }

    reverseCalculationTimeoutRef.current = setTimeout(async () => {
      setIsLoadingRate(true);
      try {
        const rate = await getExchangeRateFromExternal(selectedCurrency, "USDT");
        console.log("[TopUpDialog] Exchange rate received for reverse:", rate);
        
        if (rate !== null && !isNaN(rate) && rate > 0) {
          setExchangeRate(rate);
          const calculatedFromAmount = toAmount / rate;
          // Round to 8 decimal places (standard for crypto) and ensure it's not less than minimum
          const roundedAmount = Math.max(
            Math.round(calculatedFromAmount * 100000000) / 100000000,
            minAmountForCurrency
          );
          console.log("[TopUpDialog] Reverse calculation:", { toAmount, rate, calculatedFromAmount, roundedAmount });
          setFromAmount(roundedAmount);
          setValue("amount", roundedAmount, { shouldValidate: true });
        } else {
          console.warn("[TopUpDialog] Invalid rate for reverse calculation:", rate);
          setExchangeRate(null);
        }
      } catch (error) {
        console.error("[TopUpDialog] Error in reverse calculation:", error);
        setExchangeRate(null);
      } finally {
        setIsLoadingRate(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (reverseCalculationTimeoutRef.current) {
        clearTimeout(reverseCalculationTimeoutRef.current);
      }
    };
  }, [toAmount, lastEditedField, selectedCurrency, exchangeRate, setValue]);

  const watchedAmount = watch("amount");

  const handleCancelAndCreateNew = async () => {
    if (!activeDeposit) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await cancelDepositAction(activeDeposit.id);
      
      console.log("[TopUpDialog] Cancel deposit result:", result);
      
      // Check if there's an error in the result
      if (result && result.error) {
        console.error("[TopUpDialog] Cancel deposit error:", result.error);
        setError(result.error);
        setIsLoading(false);
        return;
      }
      
      // If we get here, cancellation was successful (result.success === true or result is truthy)
      console.log("[TopUpDialog] Deposit cancelled successfully, resetting form");
      toast.success("Deposit cancelled");
      // Reset all state when canceling
      setActiveDeposit(null);
      setPaymentData(null); // Clear payment data
      setStep("input");
      // Reset form to default values (this will reset network to POLYGON)
      reset({
        amount: undefined,
        network: "TRC20",
      });
      setIsLoading(false);
    } catch (error) {
      // This catch block should rarely be hit since cancelDepositAction handles errors internally
      console.error("[TopUpDialog] Cancel deposit unexpected error:", error);
      // Even if there's an unexpected error, try to reset the form
      // The deposit might have been cancelled on the server side
      setActiveDeposit(null);
      setPaymentData(null);
      setStep("input");
      reset({
        amount: undefined,
        network: "TRC20",
      });
      setIsLoading(false);
      // Only show error if we're sure it failed
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  const onSubmit = async (data: { amount: number; network: "TRC20" | "ERC20" | "BEP20" | "SOLANA" | "MATIC" | "TON" }) => {
    setIsLoading(true);
    setError(null);
    
    // Validate minimum amount in USDT
    const amountInUsdt = selectedCurrency === "USDT" ? data.amount : (toAmount || 0);
    if (amountInUsdt < minAmountUsdt) {
      setError(`Minimum top-up amount: ${minAmountUsdt} USDT`);
      toast.error(`Minimum top-up amount: ${minAmountUsdt} USDT`);
      setIsLoading(false);
      return;
    }

    // Validate that we have a valid conversion rate for non-USDT currencies
    if (selectedCurrency !== "USDT" && (!exchangeRate || !toAmount)) {
      setError("Unable to get exchange rate. Please try again.");
      toast.error("Unable to get exchange rate. Please try again.");
      setIsLoading(false);
      return;
    }
    
    console.log("[TopUpDialog] Creating deposit with:", {
      fromCurrency: selectedCurrency,
      fromAmount: data.amount,
      toAmount: amountInUsdt,
      network: data.network,
      exchangeRate,
    });

    const formData = new FormData();
    formData.append("amount", amountInUsdt.toString()); // Always send USDT amount
    formData.append("network", data.network);
    formData.append("currency", selectedCurrency);
    if (selectedCurrency !== "USDT") {
      formData.append("fromAmount", data.amount.toString());
    }

    try {
      const result = await createDepositAction(formData);

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        setIsLoading(false);
      } else if (result?.success && result.payAddress) {
        console.log("[TopUpDialog] Setting payment data:", {
          payAddress: result.payAddress,
          network: result.network,
          qrCode: result.qrCode ? "provided" : "not provided",
        });
        
        toast.success("Deposit created successfully");
        
        // Always use network from form data, as it's the source of truth
        // API may return network in different format or not return it at all
        const network = data.network || result.network || "TRC20";
        
        console.log("[TopUpDialog] Setting payment data with network:", {
          formNetwork: data.network,
          resultNetwork: result.network,
          finalNetwork: network,
        });
        
        setPaymentData({
          payAddress: result.payAddress,
          payAmount: result.payAmount,
          payCurrency: result.payCurrency || "usdtmatic",
          depositId: result.depositId,
          qrCode: result.qrCode,
          network: network,
        });
        setStep("payment");
        setIsLoading(false);
        
        // Immediately fetch active deposit to get confirmation info if available
        // This ensures we show status with blocks right away if payment was already sent
        setTimeout(async () => {
          try {
            const activeResult = await getActiveDepositAction();
            if (activeResult?.success && activeResult.deposit) {
              setActiveDeposit(activeResult.deposit);
            }
          } catch (error) {
            console.error("Error fetching active deposit after creation:", error);
          }
        }, 500); // Small delay to allow deposit to be saved
        
        // Refresh router to immediately show new deposit in operations list
        // Realtime event will also trigger refresh, but this ensures instant visibility
        router.refresh();
      } else {
        setError("Something went wrong. Please try again.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Top up error:", error);
      const errorInfo = handleServerActionError(error);
      setError(errorInfo.message);
      toast.error(errorInfo.message);
      setIsLoading(false);
    }
  };

  const copyAddress = async () => {
    const address = paymentData?.payAddress || activeDeposit?.address;
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        toast.success("Address copied successfully");
      } catch (error) {
        console.error("Failed to copy address:", error);
        toast.error("Failed to copy address");
      }
    }
  };

  // Show payment details (newly created or active deposit)
  if (step === "payment" && (paymentData || activeDeposit)) {
    // Use paymentData if available (newly created), otherwise use activeDeposit
    const data = paymentData || (activeDeposit ? {
      payAddress: activeDeposit.address || "",
      payAmount: activeDeposit.payAmount,
      payCurrency: activeDeposit.payCurrency,
      depositId: activeDeposit.id,
      qrCode: activeDeposit.qrCode || undefined,
      network: inferNetworkFromCurrency(activeDeposit.payCurrency) || undefined,
    } : null);

    if (!data) return null;

    // Get status display info
    const getStatusDisplay = () => {
      // If we don't have activeDeposit yet (newly created deposit), show default "paying" status
      if (!activeDeposit) {
        return {
          text: "Awaiting payment",
          bgColor: "bg-[#F4D48C]/10",
          textColor: "text-[#F4D48C]",
        };
      }
      
      const status = activeDeposit.status;
      const confirmations = activeDeposit.confirmations;
      const requiredConfirmations = activeDeposit.requiredConfirmations;
      const txStatus = activeDeposit.txStatus;

      // If status is "paid" OR confirmations reached required, show "Completed"
      if (status === "paid" || 
          (confirmations !== null && confirmations !== undefined && 
           requiredConfirmations !== null && requiredConfirmations !== undefined &&
           confirmations >= requiredConfirmations)) {
        return {
          text: "Completed",
          bgColor: "bg-[#A5EACF]/10",
          textColor: "text-[#A5EACF]",
        };
      }

      // If status is "paying" and we have confirmations info, show confirmation progress
      if (status === "paying") {
        // Check if we have confirmations data
        if (confirmations !== null && confirmations !== undefined && 
            requiredConfirmations !== null && requiredConfirmations !== undefined) {
          return {
            text: `Confirming ${confirmations}/${requiredConfirmations}`,
            bgColor: "bg-[#F4D48C]/10",
            textColor: "text-[#F4D48C]",
          };
        }
        
        // Default "paying" status (waiting for payment)
        return {
          text: "Awaiting payment",
          bgColor: "bg-[#F4D48C]/10",
          textColor: "text-[#F4D48C]",
        };
      }

      // Other statuses
      const statusText = status === "expired" ? "Expired" : status === "failed" ? "Failed" : status === "cancelled" ? "Cancelled" : getStatusText(status as OperationStatus);
      
      const statusConfig = 
        statusText === "Completed"
          ? { bg: "bg-[#A5EACF]/10", text: "text-[#A5EACF]" }
          : statusText === "Awaiting payment" || statusText.includes("Confirming")
          ? { bg: "bg-[#F4D48C]/10", text: "text-[#F4D48C]" }
          : statusText === "Failed" || statusText === "Expired" || statusText === "Cancelled"
          ? { bg: "bg-[#F2A8A8]/10", text: "text-[#F2A8A8]" }
          : { bg: "bg-[#A8CFFF]/10", text: "text-[#A8CFFF]" };

      return {
        text: statusText,
        bgColor: statusConfig.bg,
        textColor: statusConfig.text,
      };
    };

    const statusDisplay = getStatusDisplay();
    
    // Check if we're in confirming state
    const isConfirming = activeDeposit && 
      activeDeposit.status === "paying" &&
      activeDeposit.confirmations !== null && 
      activeDeposit.confirmations !== undefined &&
      activeDeposit.requiredConfirmations !== null && 
      activeDeposit.requiredConfirmations !== undefined;
    
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
          <div className="flex justify-between items-center mb-4">
            <h2 className={MODAL_STYLES.title}>
              {isConfirming ? "Confirming" : (() => {
                const payAmount = data.payAmount || activeDeposit?.payAmount || 0;
                const payCurrency = data.payCurrency || activeDeposit?.payCurrency || "USDT";
                const currencyDisplay = extractCurrencyCode(payCurrency);
                const decimals = currencyDisplay === "USDT" ? 0 : 2;
                return `Send ${payAmount.toFixed(decimals)} ${currencyDisplay} to this address`;
              })()}
            </h2>
            <button
              onClick={onClose}
              className={MODAL_STYLES.closeButton}
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* QR Code - уменьшенный на 10% - скрыт во время confirming */}
            {data.payAddress && (data.qrCode || data.payAddress) && !isConfirming && (
              <div className="flex justify-center my-8">
                {data.qrCode ? (
                  <img 
                    src={data.qrCode} 
                    alt="Payment QR Code" 
                    className="w-36 h-36 bg-white p-2 rounded"
                    onError={(e) => {
                      console.error("QR code failed to load:", data.qrCode);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encodeURIComponent(data.payAddress)}`}
                    alt="Payment QR Code" 
                    className="w-36 h-36 bg-white p-2 rounded"
                  />
                )}
              </div>
            )}

            {/* Address - полный адрес - скрыт во время confirming */}
            {data.payAddress && !isConfirming && (
              <div className="flex items-center gap-2 px-4 py-4 bg-onsurface-950 rounded-xl border border-onsurface-900">
                <code 
                  className="flex-1 text-xs text-white-900 font-mono break-all leading-relaxed"
                  title={data.payAddress}
                >
                  {data.payAddress}
                </code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={copyAddress}
                  className="flex-shrink-0"
                >
                  Copy
                </Button>
              </div>
            )}

            {/* Amount, Network, Status - в две колонки */}
            <div className="space-y-3 mt-12">
              {/* Amount */}
              <div className="flex items-center justify-between w-full mt-8">
                <p className="text-[14px] text-white-600">Amount</p>
                <p className="text-[14px] text-white-900">
                  {(() => {
                    const payAmount = data.payAmount || 0;
                    const payCurrency = data.payCurrency || "USDT";
                    const currencyDisplay = extractCurrencyCode(payCurrency);
                    const decimals = currencyDisplay === "USDT" ? 0 : 2;
                    return `${payAmount.toFixed(decimals)} ${currencyDisplay}`;
                  })()}
                </p>
              </div>

              {/* Network */}
              {(() => {
                const payCurrency = data.payCurrency || activeDeposit?.payCurrency;
                const networkDisplayName = getNetworkDisplayNameFromCurrency(payCurrency);
                
                if (!networkDisplayName) {
                  // Fallback: try to get from network field
                  const network: NetworkType | null = (data.network as NetworkType) || null;
                  if (network) {
                    const networkInfo = NETWORKS[network];
                    if (networkInfo) {
                      return (
                        <div className="flex items-center justify-between w-full">
                          <p className="text-[14px] text-white-600">Network</p>
                          <p className="text-[14px] text-white-900">{networkInfo.label}</p>
                        </div>
                      );
                    }
                  }
                  return null;
                }
                
                return (
                  <div className="flex items-center justify-between w-full">
                    <p className="text-[14px] text-white-600">Network</p>
                    <p className="text-[14px] text-white-900">{networkDisplayName}</p>
                  </div>
                );
              })()}

              {/* Status - в формате как Amount/Network */}
              {statusDisplay && (
                <div className="flex items-center justify-between w-full">
                  <p className="text-[14px] text-white-600">Status</p>
                  <p className={`text-[14px] ${statusDisplay.textColor}`}>
                    {statusDisplay.text}
                  </p>
                </div>
              )}

              {/* Timer - в формате как Amount/Network */}
              {activeDeposit && activeDeposit.status === "paying" && timeLeft && 
               !(activeDeposit.confirmations !== null && activeDeposit.confirmations !== undefined) && (
                <div className="flex items-start justify-between w-full">
                  <p className="text-[14px] text-white-600">Expires</p>
                  <p className="text-[14px] text-white-900">{timeLeft}</p>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-t border-onsurface-950 mt-8"></div>

            {/* Footer text - уменьшенный контраст */}
            {(() => {

              if (isConfirming) {
                const confirmations = activeDeposit.confirmations!;
                const requiredConfirmations = activeDeposit.requiredConfirmations!;
                const progress = Math.min((confirmations / requiredConfirmations) * 100, 100);
                const circumference = 2 * Math.PI * 16; // radius = 16
                const offset = circumference - (progress / 100) * circumference;

                return (
            <div className="flex items-center gap-6 mt-12 mb-8">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                        {/* Background circle */}
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-onsurface-800"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          stroke="#F4D48C"
                          strokeWidth="2"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          className="transition-all duration-300"
                        />
                      </svg>
                    </div>
                    <p className="text-caption text-white-600">
                      Confirming transaction... <br /> {confirmations} of {requiredConfirmations} confirmations ({Math.round(progress)}%).
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex items-center gap-6 mt-12 mb-8">
                  <div className="flex items-center gap-2 h-8">
                <div 
                  className="w-0.5 bg-white-600 rounded-full"
                  style={{
                        height: '24px',
                    animation: 'scaleLoader 1.2s ease-in-out infinite',
                    animationDelay: '0ms'
                  }}
                />
                <div 
                  className="w-0.5 bg-white-600 rounded-full"
                  style={{
                        height: '24px',
                    animation: 'scaleLoader 1.2s ease-in-out infinite',
                    animationDelay: '0.2s'
                  }}
                />
                <div 
                  className="w-0.5 bg-white-600 rounded-full"
                  style={{
                        height: '24px',
                    animation: 'scaleLoader 1.2s ease-in-out infinite',
                    animationDelay: '0.4s'
                  }}
                />
              </div>
              <p className="text-caption text-white-600">
                    Once you send USDT, the transaction <br /> will move to confirmation status within 1 minute.
              </p>
            </div>
              );
            })()}
            {/* Separator - скрыт во время confirming */}
            {!isConfirming && (
              <div className="border-t border-onsurface-950 mt-8"></div>
            )}
            {/* Button - скрыта во время confirming */}
            {activeDeposit && !isConfirming && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelAndCreateNew}
                isLoading={isLoading}
                className="w-full py-2"
              >
                Cancel top-up & start new
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking for active deposit
  if (step === "check" && isCheckingActiveDeposit) {
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
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" className="border-white-900" />
          </div>
        </div>
      </div>
    );
  }

  // Show input form
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
        <div className="flex justify-between items-center mb-6">
          <h2 className={MODAL_STYLES.title}>Top up balance</h2>
          <button
            onClick={onClose}
            className={MODAL_STYLES.closeButton}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-surface-800 border border-redhaze text-redhaze text-body">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Currency Selection */}
          <div>
            <label className="block text-caption text-white-900 font-medium mb-3">
              Currency
            </label>
            <CurrencySelect
              value={selectedCurrency}
              onChange={(currency) => {
                setSelectedCurrency(currency);
                setLastEditedField(null);
                setFromAmount(undefined);
                setToAmount(undefined);
                setToAmountInput("");
                setValue("amount", 0, { shouldValidate: false });
              }}
              disabled={isLoading}
            />
          </div>

          {/* Amount Input */}
          {selectedCurrency === "USDT" ? (
            // For USDT: single amount input + network selection
            <>
              <div>
                <label className="block text-caption text-white-900 font-medium mb-3">
                  Amount (USDT)
                </label>
            <Input
              type="number"
              step="1"
                  min={minAmountUsdt}
              placeholder="20"
              disabled={isLoading}
                  value={fromAmount !== undefined ? fromAmount : ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                    setFromAmount(value);
                    setToAmount(value); // For USDT, toAmount = fromAmount
                    setValue("amount", value || 0, { shouldValidate: true });
            }}
            error={errors.amount?.message as string}
          />
          <p className="text-small text-white-700 mt-2">
                  Minimum top-up amount — {minAmountUsdt} USDT
          </p>
          </div>

          <div>
            <label className="block text-caption text-white-900 font-medium mb-3">
              Network
            </label>
            <NetworkSelect
              value={watch("network") || "TRC20"}
              onChange={(value) => setValue("network", value)}
              disabled={isLoading}
              error={errors.network?.message as string}
            />
            <p className="mt-2 text-caption text-white-600">
                  Network fees may apply.
                </p>
              </div>
            </>
          ) : (
            // For other currencies: From/To with conversion
            <>
              <div>
                <label className="block text-caption text-white-900 font-medium mb-3">
                  You Pay
                </label>
                <Input
                  type="number"
                  step="0.00000001"
                  min={minAmountForCurrency}
                  placeholder="0.001"
                  disabled={isLoading}
                  value={fromAmount !== undefined ? fromAmount : ""}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === "" || inputValue === null || inputValue === undefined) {
                      setFromAmount(undefined);
                      setValue("amount", undefined as any, { shouldValidate: false });
                    } else {
                      const numValue = parseFloat(inputValue);
                      if (!isNaN(numValue) && numValue > 0) {
                        setFromAmount(numValue);
                        setLastEditedField("from");
                        setValue("amount", numValue, { shouldValidate: true });
                      } else {
                        setFromAmount(undefined);
                        setToAmount(undefined);
                        setLastEditedField(null);
                        setValue("amount", undefined as any, { shouldValidate: false });
                      }
                    }
                  }}
                  error={errors.amount?.message as string}
                />
                <p className="text-small text-white-700 mt-2">
                  You send {selectedCurrency}.
            </p>
          </div>

              {/* To Amount (USDT) - Editable with reverse calculation */}
              <div>
                <label className="block text-caption text-white-900 font-medium mb-3">
                  You will Get
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={minAmountUsdt}
                  placeholder="0.00"
                  disabled={isLoading || isLoadingRate}
                  value={toAmountInput}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setToAmountInput(inputValue);
                    
                    if (inputValue === "" || inputValue === null || inputValue === undefined) {
                      setToAmount(undefined);
                      setFromAmount(undefined);
                      setLastEditedField(null);
                      setValue("amount", undefined as any, { shouldValidate: false });
                    } else {
                      const numValue = parseFloat(inputValue);
                      if (!isNaN(numValue) && numValue > 0) {
                        setToAmount(numValue);
                        setLastEditedField("to");
                        
                        // Reverse calculation: fromAmount = toAmount / exchangeRate
                        // Only calculate immediately if we have exchange rate (no API call needed)
                        if (exchangeRate && exchangeRate > 0) {
                          const calculatedFromAmount = numValue / exchangeRate;
                          // Round to 8 decimal places (standard for crypto) and ensure it's not less than minimum
                          const roundedAmount = Math.max(
                            Math.round(calculatedFromAmount * 100000000) / 100000000,
                            minAmountForCurrency
                          );
                          setFromAmount(roundedAmount);
                          setValue("amount", roundedAmount, { shouldValidate: true });
                        }
                        // If no rate yet, the separate useEffect will fetch it with debounce
                      } else {
                        setToAmount(undefined);
                        setFromAmount(undefined);
                        setLastEditedField(null);
                        setValue("amount", undefined as any, { shouldValidate: false });
                      }
                    }
                  }}
                  error={errors.amount?.message as string}
                />
                <p className="text-small text-white-700 mt-2">
                  You receive USDT.
                </p>
              </div>
            </>
          )}

          {/* Exchange Rate Summary - only for non-USDT currencies */}
          {selectedCurrency !== "USDT" && exchangeRate && fromAmount && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-caption text-white-600">Rate:</span>
                <span className="text-body text-white-900">
                  1 {selectedCurrency} = {exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} USDT
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-caption text-white-600">Fee:</span>
                <span className="text-body text-right">
                  <span className="text-white-900">0 USDT</span>
                  <br />
                  <span className="text-white-700">(Axon does not charge fees)</span>
                </span>
              </div>
            </div>
          )}

          {/* Minimum amount info - only for non-USDT currencies, hide when rate is shown */}
          {selectedCurrency !== "USDT" && !(exchangeRate && fromAmount) && (
            <p className="text-small text-white-700">
              Minimum top-up amount — {minAmountForCurrency} {selectedCurrency} ({minAmountUsdt} USDT)
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              isLoading={isLoading || isLoadingRate}
              disabled={
                !fromAmount ||
                isNaN(fromAmount) ||
                (selectedCurrency === "USDT" 
                  ? fromAmount < minAmountUsdt
                  : (fromAmount < minAmountForCurrency || !toAmount || toAmount < minAmountUsdt))
              }
              className="w-full mt-4"
            >
              Top up balance
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
