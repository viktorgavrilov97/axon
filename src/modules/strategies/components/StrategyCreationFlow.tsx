"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Input } from "@/shared/ui/inputs";
import { Button } from "@/shared/ui/button";
import { createStrategyAction } from "../api/create-strategy";
import { calculateStrategyDetails } from "../lib/strategies-calculator";
import { StrategyConfigData } from "../lib/strategies-types";
import { handleServerActionError } from "@/shared/lib/server-action-error-handler";

// Format date consistently for server and client (DD.MM.YYYY)
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

const MAX_VALUE = 12;
const SEGMENT_WIDTH = 2; // px
const SEGMENT_GAP = 8; // px

interface StrategyCreationFlowProps {
  configs: StrategyConfigData[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StrategyCreationFlow({
  configs,
  onSuccess,
  onCancel,
}: StrategyCreationFlowProps) {
  const router = useRouter();
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    minPercent: number;
    maxPercent: number;
    estimatedTotalProfit: number;
    principalReturnDate: Date;
  } | null>(null);
  const [potentialBoost, setPotentialBoost] = useState<{
    current?: { 
      effectiveBonusPercent: number; 
      activeStrategiesCount: number; 
      baseBonusPercent?: number;
      diversityScore?: number;
      largestShare?: number;
    };
    potential: { 
      effectiveBonusPercent: number; 
      activeStrategiesCount: number; 
      willActivate: boolean; 
      baseBonusPercent: number;
      diversityScore: number;
      largestShare: number;
      recommendedAmount?: number;
      balanceHint?: string;
    };
    improvement: { effectiveBonusPercentChange: number };
  } | null>(null);
  const [loadingBoost, setLoadingBoost] = useState(false);
  const [totalSegments, setTotalSegments] = useState(40);
  const energyBarRef = useRef<HTMLDivElement>(null);

  // If only one config is provided, auto-select it
  const singleConfig = configs.length === 1 ? configs[0] : null;
  const selectedConfig = selectedConfigId
    ? configs.find((c) => c.id === selectedConfigId)
    : singleConfig;
  
  // Auto-select if only one config
  useEffect(() => {
    if (singleConfig && !selectedConfigId) {
      setSelectedConfigId(singleConfig.id || null);
    }
  }, [singleConfig, selectedConfigId]);

  // Calculate number of segments based on container width
  useEffect(() => {
    const updateSegments = () => {
      if (energyBarRef.current) {
        const containerWidth = energyBarRef.current.offsetWidth;
        const segmentsPerRow = Math.floor((containerWidth + SEGMENT_GAP) / (SEGMENT_WIDTH + SEGMENT_GAP));
        setTotalSegments(Math.max(10, Math.min(segmentsPerRow, 100))); // min 10, max 100
      }
    };

    if (energyBarRef.current) {
      const resizeObserver = new ResizeObserver(updateSegments);
      resizeObserver.observe(energyBarRef.current);
      
      setTimeout(updateSegments, 0);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [potentialBoost]);

  // Calculate preview when inputs change
  useEffect(() => {
    if (selectedConfig && amount && durationDays) {
      try {
        const amountNum = parseFloat(amount);
        const durationNum = parseInt(durationDays);

        if (
          amountNum >= selectedConfig.minAmount &&
          amountNum <= selectedConfig.maxAmount &&
          durationNum >= selectedConfig.minDays &&
          durationNum <= selectedConfig.maxDays
        ) {
          const details = calculateStrategyDetails(
            {
              type: selectedConfig.type,
              name: selectedConfig.name,
              minAmount: selectedConfig.minAmount,
              maxAmount: selectedConfig.maxAmount,
              minDays: selectedConfig.minDays,
              maxDays: selectedConfig.maxDays,
              baseMinPercent: selectedConfig.baseMinPercent,
              baseMaxPercent: selectedConfig.baseMaxPercent,
              allowMultiplier: selectedConfig.allowMultiplier,
            },
            amountNum,
            durationNum
          );
          setPreview(details);
          setError(null);

          // Calculate potential boost
          if (selectedConfig.id) {
            setLoadingBoost(true);
            fetch("/api/strategies/potential-boost", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: amountNum,
                configId: selectedConfig.id,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.error) {
                  setPotentialBoost(null);
                } else {
                  setPotentialBoost(data);
                }
              })
              .catch(() => setPotentialBoost(null))
              .finally(() => setLoadingBoost(false));
          }
        } else {
          setPreview(null);
          setPotentialBoost(null);
        }
      } catch (err) {
        setPreview(null);
        setPotentialBoost(null);
        setError(err instanceof Error ? err.message : "Invalid input");
      }
    } else {
      setPreview(null);
      setPotentialBoost(null);
    }
  }, [selectedConfig, amount, durationDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfigId || !amount || !durationDays || !selectedConfig) {
      setError("Please fill all fields");
      return;
    }

    if (!selectedConfig.id) {
      setError("Invalid strategy configuration");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("configId", selectedConfig.id);
      formData.append("amount", amount);
      formData.append("durationDays", durationDays);

      const result = await createStrategyAction(formData);

      if (result.success) {
        toast.success("Investment created successfully");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/strategies");
          router.refresh();
        }
      } else {
        const errorMsg = result.error || "Failed to create strategy";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorInfo = handleServerActionError(err);
      setError(errorInfo.message);
      toast.error(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-onsurface-900 border border-redhaze text-redhaze text-body rounded-xl">
          {error}
        </div>
      )}

      {/* Strategy Configuration Selection - only show if multiple configs */}
      {configs.length > 1 && (
        <div>
          <label className="block text-body text-white-900 mb-3">
            Choose Strategy
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {configs.map((config) => (
              <button
                key={config.id || config.type}
                type="button"
                onClick={() => config.id && setSelectedConfigId(config.id)}
                disabled={!config.id}
                className={`p-4 rounded-xl border transition-all ${
                  selectedConfigId === config.id
                    ? "border-white-900 bg-onsurface-900"
                    : "border-onsurface-900 bg-onsurface-950 hover:bg-onsurface-900"
                } ${!config.id ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <p className="text-body text-white-900 font-medium">{config.name}</p>
                <p className="text-small text-white-600 mt-1">
                  {config.minDays}-{config.maxDays} days
                </p>
                <p className="text-small text-white-600 mt-1">
                  {config.minAmount.toFixed(2)} - {config.maxAmount.toFixed(2)} USDT
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedConfig && (
        <>
          {/* Amount Input */}
          <Input
            label="Amount (USDT)"
            type="number"
            step="0.01"
            min={selectedConfig.minAmount}
            max={selectedConfig.maxAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`${selectedConfig.minAmount} - ${selectedConfig.maxAmount} USDT`}
            required
          />

          {/* Duration Input */}
          <Input
            label="Duration (days)"
            type="number"
            value={durationDays}
            onChange={(e) => {
              const value = e.target.value;
              // Allow empty value for typing
              if (value === "") {
                setDurationDays("");
                return;
              }
              // Allow any numeric input, validation happens in useEffect
              setDurationDays(value);
            }}
            placeholder={`${selectedConfig.minDays} - ${selectedConfig.maxDays} days`}
            required
            error={
              durationDays &&
              selectedConfig &&
              (parseInt(durationDays) < selectedConfig.minDays ||
                parseInt(durationDays) > selectedConfig.maxDays)
                ? `Must be between ${selectedConfig.minDays} and ${selectedConfig.maxDays} days`
                : undefined
            }
          />

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-body font-medium text-white-900">
                  Strategy Preview
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-[14px] text-white-600">Today&apos;s percent range</p>
                    <p className="text-[14px] text-white-900">
                      {preview.minPercent.toFixed(2)}% - {preview.maxPercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <p className="text-[14px] text-white-600">Est. total profit</p>
                    <p className="text-[14px] text-mint">
                      {preview.estimatedTotalProfit.toFixed(2)} USDT
                    </p>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <p className="text-[14px] text-white-600">Principal returns on</p>
                    <p className="text-[14px] text-white-900">
                      {formatDate(preview.principalReturnDate)}
                    </p>
                  </div>
                  <p className="text-small text-white-600 mt-3">
                    Daily yield fluctuates within this range
                  </p>
                </div>
              </div>

              {/* Potential Yield Multiplayer */}
              {potentialBoost && potentialBoost.potential.baseBonusPercent > 0 && (
                <div className="p-4 bg-onsurface-900 border border-onsurface-950 rounded-xl space-y-3">
                  <h3 className="text-body font-medium text-white-900">Yield Multiplayer Impact</h3>
                  {potentialBoost.current ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-small text-white-600">Current boost</p>
                        <p className="text-body text-white-900">
                          +{potentialBoost.current.effectiveBonusPercent.toFixed(2)}%
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-small text-white-600">After this investment</p>
                        <p className={`text-body ${potentialBoost.potential.effectiveBonusPercent > 0 ? 'text-mint' : 'text-white-600'}`}>
                          +{potentialBoost.potential.effectiveBonusPercent.toFixed(2)}%
                        </p>
                      </div>
                      {potentialBoost.improvement.effectiveBonusPercentChange > 0 && (
                        <div className="pt-2 border-t border-onsurface-950">
                          <p className="text-small text-mint">
                            +{potentialBoost.improvement.effectiveBonusPercentChange.toFixed(2)}% boost increase
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-small text-white-600">Base boost</p>
                        <p className="text-body text-mint">
                          +{potentialBoost.potential.baseBonusPercent.toFixed(0)}%
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-small text-white-600">Effective boost</p>
                        <p className={`text-body ${potentialBoost.potential.effectiveBonusPercent > 0 ? 'text-mint' : 'text-white-600'}`}>
                          +{potentialBoost.potential.effectiveBonusPercent.toFixed(2)}%
                        </p>
                      </div>
                      {potentialBoost.potential.effectiveBonusPercent === 0 && (
                        <div className="pt-2 border-t border-onsurface-950">
                          <p className="text-small text-white-600 mb-1">
                            Diversity score: {Math.round(potentialBoost.potential.diversityScore * 100)}%
                          </p>
                          <p className="text-small text-white-600 mb-1">
                            Largest share: {Math.round(potentialBoost.potential.largestShare * 100)}%
                          </p>
                          {potentialBoost.potential.balanceHint && (
                            <p className="text-small text-mint mt-2">
                              💡 {potentialBoost.potential.balanceHint}
                            </p>
                          )}
                          <p className="text-small text-white-600 mt-2">
                            Balance your portfolio (keep largest share ≤ 60% for max boost)
                          </p>
                        </div>
                      )}
                      {potentialBoost.potential.willActivate && (
                        <p className="text-small text-mint">
                          ✅ This investment will activate Yield Multiplayer!
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-small text-white-600 mt-2">
                    Yield Multiplayer applies to daily profits from all active strategies
                  </p>
                </div>
              )}
              {loadingBoost && (
                <div className="p-4 bg-onsurface-900 border border-onsurface-950 rounded-xl">
                  <p className="text-small text-white-600">Calculating boost impact...</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={loading || !preview} className="w-full mt-8">
              {loading ? "Investing..." : "Invest"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

