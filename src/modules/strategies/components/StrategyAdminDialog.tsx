"use client";

import { StrategyConfigData } from "../lib/strategies-types";
import { StrategyAdminForm } from "./StrategyAdminForm";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";

interface StrategyAdminDialogProps {
  config?: StrategyConfigData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StrategyAdminDialog({ config, onClose, onSuccess }: StrategyAdminDialogProps) {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
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
        <div className="flex justify-between items-center mb-6">
          <h2 className={MODAL_STYLES.title}>
            {config ? "Edit Strategy Configuration" : "Create Strategy Configuration"}
          </h2>
          <button
            onClick={onClose}
            className={MODAL_STYLES.closeButton}
          >
            ✕
          </button>
        </div>

        <StrategyAdminForm
          config={config}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

