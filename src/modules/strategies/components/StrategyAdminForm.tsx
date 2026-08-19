"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { StrategyType } from "@prisma/client";
import { Input } from "@/shared/ui/inputs";
import { Button } from "@/shared/ui/button";
import { adminCreateStrategyConfigAction } from "../api/admin-create-strategy";
import { adminUpdateStrategyConfigAction } from "../api/admin-update-strategy";
import { calculatePercentBoundaries } from "../lib/strategies-calculator";
import { StrategyConfigData } from "../lib/strategies-types";
import { handleServerActionError } from "@/shared/lib/server-action-error-handler";

interface StrategyAdminFormProps {
  config?: StrategyConfigData | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StrategyAdminForm({
  config,
  onSuccess,
  onCancel,
}: StrategyAdminFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: config?.name || "",
    description: config?.description || "",
    accentColor: config?.accentColor || "",
    minAmount: config?.minAmount.toString() || "",
    maxAmount: config?.maxAmount.toString() || "",
    minDays: config?.minDays.toString() || "",
    maxDays: config?.maxDays.toString() || "",
    baseMinPercent: config?.baseMinPercent.toString() || "",
    baseMaxPercent: config?.baseMaxPercent.toString() || "",
    allowMultiplier: config?.allowMultiplier || false,
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    minPercent: number;
    maxPercent: number;
  } | null>(null);

  // Calculate preview for example values
  useEffect(() => {
    try {
      const configData: StrategyConfigData = {
        type: "DAY" as StrategyType, // Все стратегии по дням
        name: formData.name,
        minAmount: parseFloat(formData.minAmount) || 0,
        maxAmount: parseFloat(formData.maxAmount) || 0,
        minDays: parseInt(formData.minDays) || 0,
        maxDays: parseInt(formData.maxDays) || 0,
        baseMinPercent: parseFloat(formData.baseMinPercent) || 0,
        baseMaxPercent: parseFloat(formData.baseMaxPercent) || 0,
        allowMultiplier: formData.allowMultiplier,
      };

      if (
        configData.minAmount > 0 &&
        configData.maxAmount > configData.minAmount &&
        configData.minDays > 0 &&
        configData.maxDays > configData.minDays &&
        configData.baseMinPercent > 0 &&
        configData.baseMaxPercent > configData.baseMinPercent
      ) {
        // Calculate for middle values (amount doesn't affect percent, only duration does)
        const exampleAmount = (configData.minAmount + configData.maxAmount) / 2;
        const exampleDays = Math.floor(
          (configData.minDays + configData.maxDays) / 2
        );

        // Percent depends ONLY on duration, not on amount
        const result = calculatePercentBoundaries(
          configData,
          exampleAmount,
          exampleDays
        );
        setPreview(result);
      } else {
        setPreview(null);
      }
    } catch (err) {
      setPreview(null);
    }
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitFormData = new FormData();
      // Include id if editing existing config
      if (config?.id) {
        submitFormData.append("id", config.id);
      }
      submitFormData.append("type", "DAY"); // Все стратегии по дням
      submitFormData.append("category", ""); // Category no longer used, send empty string
      Object.entries(formData).forEach(([key, value]) => {
        submitFormData.append(key, value.toString());
      });

      const result = config
        ? await adminUpdateStrategyConfigAction(submitFormData)
        : await adminCreateStrategyConfigAction(submitFormData);

      if (result.success) {
        toast.success(config ? "Strategy configuration updated successfully" : "Strategy configuration created successfully");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/admin/strategies");
          router.refresh();
        }
      } else {
        const errorMsg = result.error || "Failed to save configuration";
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

      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="e.g., Bondex Gold"
        required
      />

      <div>
        <label className="block text-caption text-white-900 font-medium mb-3">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter strategy description..."
          rows={3}
          className="w-full px-4 py-3 bg-surface-900 border border-onsurface-800 rounded-xl text-body text-white-900 placeholder-white-600 focus:outline-none focus:ring-2 focus:ring-white-900 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-caption text-white-900 font-medium mb-3">
          Accent Color (Hex)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={formData.accentColor || "#781FF5"}
            onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
            className="w-16 h-10 rounded-lg border border-onsurface-800 cursor-pointer bg-transparent"
          />
          <Input
            type="text"
            value={formData.accentColor}
            onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
            placeholder="#781FF5"
            pattern="^#[0-9A-Fa-f]{6}$"
          />
        </div>
        <p className="text-small text-white-600 mt-2">Color for the top border line (4px)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Min Amount (USDT)"
          type="number"
          step="0.01"
          value={formData.minAmount}
          onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
          required
        />
        <Input
          label="Max Amount (USDT)"
          type="number"
          step="0.01"
          value={formData.maxAmount}
          onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Min Days"
          type="number"
          value={formData.minDays}
          onChange={(e) => setFormData({ ...formData, minDays: e.target.value })}
          required
        />
        <Input
          label="Max Days"
          type="number"
          value={formData.maxDays}
          onChange={(e) => setFormData({ ...formData, maxDays: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Base Min Percent"
          type="number"
          step="0.01"
          value={formData.baseMinPercent}
          onChange={(e) =>
            setFormData({ ...formData, baseMinPercent: e.target.value })
          }
          required
        />
        <Input
          label="Base Max Percent"
          type="number"
          step="0.01"
          value={formData.baseMaxPercent}
          onChange={(e) =>
            setFormData({ ...formData, baseMaxPercent: e.target.value })
          }
          required
        />
      </div>

      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={formData.allowMultiplier}
            onChange={(e) =>
              setFormData({ ...formData, allowMultiplier: e.target.checked })
            }
            className="w-5 h-5 rounded border-onsurface-800 bg-surface-900"
          />
          <span className="text-body text-white-900">Allow Multiplier</span>
        </label>
      </div>

      {/* Live Preview */}
      {preview && (
        <div className="p-4 bg-onsurface-900 border border-onsurface-950 rounded-xl">
          <h3 className="text-body font-medium text-white-900 mb-3">
            Live Preview (example values)
          </h3>
          <div className="space-y-2">
            <p className="text-small text-white-600">
              Min Percent: <span className="text-white-900">{preview.minPercent.toFixed(2)}%</span>
            </p>
            <p className="text-small text-white-600">
              Max Percent: <span className="text-white-900">{preview.maxPercent.toFixed(2)}%</span>
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="w-full mt-8">
          {loading ? "Saving..." : config ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

