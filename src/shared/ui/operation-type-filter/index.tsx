"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Button } from "../button";
import { MODAL_STYLES } from "../modal/styles";

export type OperationTypeFilter = "all" | "deposit" | "withdrawal" | "strategy_investment" | "referral_payout";

interface OperationTypeOption {
  value: OperationTypeFilter;
  label: string;
}

const operationTypes: OperationTypeOption[] = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Top-Ups" },
  { value: "withdrawal", label: "Withdrawals" },
  { value: "strategy_investment", label: "Investments" },
  { value: "referral_payout", label: "Affiliate" },
];

interface OperationTypeFilterProps {
  value: OperationTypeFilter;
  onChange: (value: OperationTypeFilter) => void;
  disabled?: boolean;
}

export function OperationTypeFilter({ value, onChange, disabled }: OperationTypeFilterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedOption = operationTypes.find((opt) => opt.value === value) || operationTypes[0];

  const handleSelect = (newValue: OperationTypeFilter) => {
    onChange(newValue);
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <span>{selectedOption.label}</span>
        <CaretDown size={16} weight="regular" />
      </Button>

      {/* Operation Type Selection Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[10002] flex items-center justify-center p-4 isolate"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div
            className="modal-content-bg rounded-2xl border border-onsurface-950 p-4 overflow-y-auto shadow-2xl w-full max-w-md max-h-[90vh] relative z-[10003] isolate modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: 'translateZ(0)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className={MODAL_STYLES.title}>Filter Operations</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className={MODAL_STYLES.closeButton}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {operationTypes.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-3 flex items-center text-left transition-all rounded-xl ${
                    value === option.value
                      ? "bg-onsurface-900 text-white-900"
                      : "text-white-900 hover:bg-onsurface-900"
                  }`}
                >
                  <div className="text-body text-white-900">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


