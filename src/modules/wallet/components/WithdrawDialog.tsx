"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { requestWithdrawalAction } from "../api/create-withdrawal";
import { validateWithdrawalAddress } from "../lib/address-validation";
import { NetworkSelect } from "@/shared/ui/network-select";
import { NETWORKS } from "../lib/network-types";
import type { WithdrawalNetworkType } from "../lib/network-types";
import { Input } from "@/shared/ui/inputs";
import { Button } from "@/shared/ui/button";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { handleServerActionError } from "@/shared/lib/server-action-error-handler";

const withdrawalSchema = z.object({
  amount: z.number().min(0.1, "Minimum amount: $0.1"),
  // Only allow USDT networks that we can actually pay out automatically
  network: z.enum(["TRC20", "ERC20", "BEP20", "MATIC"], {
    message: "Please select a network",
  }),
  toAddress: z.string().min(1, "Address is required"),
}).superRefine((data, ctx) => {
  const validation = validateWithdrawalAddress(data.toAddress, data.network);
  if (!validation.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: validation.error || "Invalid address",
      path: ["toAddress"],
    });
  }
});

interface WithdrawDialogProps {
  onClose: () => void;
}

export function WithdrawDialog({ onClose }: WithdrawDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<{ amount: number; network: WithdrawalNetworkType; toAddress: string }>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      network: "TRC20",
    },
  });

  const watchedNetwork = watch("network");
  const watchedAmount = watch("amount");
  const networkInfo = NETWORKS[watchedNetwork] || NETWORKS.TRC20;

  // Validate address on change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    if (address && watchedNetwork) {
      const validation = validateWithdrawalAddress(address, watchedNetwork);
      if (!validation.ok) {
        setAddressError(validation.error || null);
      } else {
        setAddressError(null);
      }
    } else {
      setAddressError(null);
    }
  };

  const onSubmit = async (data: { amount: number; network: WithdrawalNetworkType; toAddress: string }) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("amount", data.amount.toString());
    formData.append("network", data.network);
    formData.append("toAddress", data.toAddress);

    try {
      const result = await requestWithdrawalAction(formData);

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        setIsLoading(false);
      } else if (result?.success) {
        toast.success("Withdrawal request sent successfully");
        setSuccess(true);
        setIsLoading(false);
      } else {
        const errorMsg = "Something went wrong. Please try again.";
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      const { handleServerActionError } = await import("@/shared/lib/server-action-error-handler");
      const errorInfo = handleServerActionError(error);
      setError(errorInfo.message);
      toast.error(errorInfo.message);
      setIsLoading(false);
    }
  };

  if (success) {
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
          <h2 className={`${MODAL_STYLES.title} mb-4`}>Request sent</h2>
          <p className="text-body text-white-600 mb-6">
            Withdrawal request sent. We will notify you after processing.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

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
          <h2 className={MODAL_STYLES.title}>Withdraw funds</h2>
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

        <p className="text-body text-white-600 mb-4">
          Withdrawal request will be sent to administrator. After processing, you will receive funds to the specified address.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Amount, USDT"
            type="number"
            step="0.01"
            min="0.1"
            placeholder="10.00"
            {...register("amount", { valueAsNumber: true })}
            error={errors.amount?.message as string}
          />

          <div>
            <label className="block text-caption text-white-900 font-medium mb-3">
              Network
            </label>
            <NetworkSelect
              value={watchedNetwork || "TRC20"}
              onChange={(value) => setValue("network", value as WithdrawalNetworkType)}
              allowedNetworks={["TRC20", "ERC20", "BEP20", "MATIC"]}
              disabled={isLoading}
              error={errors.network?.message as string}
            />
          </div>

          <Input
            label="Wallet address"
            type="text"
            placeholder={networkInfo.addressPlaceholder}
            {...register("toAddress", {
              onChange: handleAddressChange,
            })}
            error={(addressError || errors.toAddress?.message) as string}
          />

          <div className="flex gap-3">
            <Button type="submit" isLoading={isLoading} className="w-full mt-8">
              Send request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

