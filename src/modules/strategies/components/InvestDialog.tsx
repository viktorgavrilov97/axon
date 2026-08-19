"use client";

import { StrategyConfigData } from "../lib/strategies-types";
import { StrategyCreationFlow } from "./StrategyCreationFlow";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";

interface InvestDialogProps {
  config: StrategyConfigData;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InvestDialog({ config, onClose, onSuccess }: InvestDialogProps) {
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
          <h2 className={MODAL_STYLES.title}>Invest in {config.name}</h2>
          <button
            onClick={onClose}
            className={MODAL_STYLES.closeButton}
          >
            ✕
          </button>
        </div>

        <StrategyCreationFlow
          configs={[config]}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

