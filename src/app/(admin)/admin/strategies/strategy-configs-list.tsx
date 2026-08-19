"use client";

import { useState, useTransition, useEffect } from "react";
import { StrategyConfigData } from "@/modules/strategies/lib/strategies-types";
import { Trash } from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { Button } from "@/shared/ui/button";
import { adminDeleteStrategyConfigAction } from "@/modules/strategies/api/admin-delete-strategy";
import { StrategyAdminDialog } from "@/modules/strategies/components/StrategyAdminDialog";
import { useRouter } from "next/navigation";

interface StrategyConfigsListProps {
  configs: any[];
}

export function StrategyConfigsList({ configs: initialConfigs }: StrategyConfigsListProps) {
  const router = useRouter();
  const [configs, setConfigs] = useState(initialConfigs);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<StrategyConfigData | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Sync local state with initialConfigs when they change (after refresh)
  useEffect(() => {
    setConfigs(initialConfigs);
  }, [initialConfigs]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the strategy configuration "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const result = await adminDeleteStrategyConfigAction(id);
      if (result.success) {
        toast.success("Strategy configuration deleted successfully");
        setConfigs((prev) => prev.filter((c) => c.id !== id));
        startTransition(() => {
          router.refresh();
        });
      } else {
        const errorMsg = result.error || "Failed to delete strategy configuration";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete strategy configuration");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
    startTransition(() => {
      router.refresh();
    });
  };

  const handleEditSuccess = () => {
    setEditingConfig(null);
    startTransition(() => {
      router.refresh();
    });
  };

  if (configs.length === 0 && !showCreateDialog) {
    return (
      <div className="space-y-4">
      <div className="p-8 text-center">
          <p className="text-body text-white-600 mb-4">No strategy configurations found</p>
          <Button onClick={() => setShowCreateDialog(true)}>Create New</Button>
        </div>

        {showCreateDialog && (
          <StrategyAdminDialog
            config={null}
            onClose={() => setShowCreateDialog(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreateDialog(true)}>Create New</Button>
      </div>
      {error && (
        <div className="p-4 bg-onsurface-900 border border-redhaze text-redhaze text-body rounded-xl">
          {error}
        </div>
      )}

      {configs.map((config) => (
        <div
          key={config.id}
          className="p-6 rounded-xl border border-onsurface-900 bg-onsurface-950"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-heading text-white-900">{config.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingConfig(config)}
                className="flex items-center gap-2"
              >
                  Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDelete(config.id, config.name)}
                disabled={deletingId === config.id || isPending}
                className="flex items-center gap-2"
              >
                <Trash size={16} weight="regular" />
                {deletingId === config.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-small text-white-600">Amount Range</p>
              <p className="text-body text-white-900">
                {Number(config.minAmount).toFixed(2)} - {Number(config.maxAmount).toFixed(2)} USDT
              </p>
            </div>
            <div>
              <p className="text-small text-white-600">Duration Range</p>
              <p className="text-body text-white-900">
                {config.minDays} - {config.maxDays} days
              </p>
            </div>
            <div>
              <p className="text-small text-white-600">Base Percent Range</p>
              <p className="text-body text-white-900">
                {Number(config.baseMinPercent).toFixed(2)}% - {Number(config.baseMaxPercent).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-small text-white-600">Multiplier</p>
              <p className="text-body text-white-900">
                {config.allowMultiplier ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
        </div>
      ))}

      {showCreateDialog && (
        <StrategyAdminDialog
          config={null}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingConfig && (
        <StrategyAdminDialog
          config={editingConfig}
          onClose={() => setEditingConfig(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

