"use client";

import { useState, useEffect } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";

export type PeriodType = "week" | "month" | "quarter" | "halfyear" | "all";

interface PeriodOption {
  value: PeriodType;
  label: string;
  description: string;
}

const periods: PeriodOption[] = [
  {
    value: "week",
    label: "Week",
    description: "Last 7 days",
  },
  {
    value: "month",
    label: "Month",
    description: "Current month",
  },
  {
    value: "quarter",
    label: "Quarter",
    description: "Current quarter",
  },
  {
    value: "halfyear",
    label: "Half Year",
    description: "Last 6 months",
  },
  {
    value: "all",
    label: "All Time",
    description: "All available data",
  },
];

interface PeriodSelectProps {
  value: PeriodType;
  onChange: (value: PeriodType) => void;
  disabled?: boolean;
}

export function PeriodSelect({ value, onChange, disabled }: PeriodSelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedPeriod = periods.find((p) => p.value === value) || periods[0];

  // Handle ESC key press
  useEffect(() => {
    if (!isModalOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isModalOpen]);

  const handleSelect = (periodValue: PeriodType) => {
    onChange(periodValue);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="w-full relative">
        <button
          type="button"
          onClick={() => !disabled && setIsModalOpen(true)}
          disabled={disabled}
          className={`h-10 px-4 pr-12 bg-transparent hover:bg-onsurface-950 border rounded-xl text-body text-white-900 focus:outline-none focus:border-white-900 focus:shadow-[0_0_0_1px_rgba(255,255,255,1)] transition-all flex items-center gap-3 ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } border-onsurface-800`}
        >
          <span className="text-body text-white-900 truncate">{selectedPeriod.label}</span>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <CaretDown
              size={16}
              weight="regular"
              className="text-white-700"
            />
          </div>
        </button>
      </div>

      {/* Period Selection Modal */}
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
              <h2 className={MODAL_STYLES.title}>Select Period</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className={MODAL_STYLES.closeButton}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {periods.map((period) => (
                <button
                  key={period.value}
                  type="button"
                  onClick={() => handleSelect(period.value)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-all rounded-xl ${
                    value === period.value
                      ? "bg-onsurface-900 text-white-900"
                      : "text-white-900 hover:bg-onsurface-900"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-body text-white-900 mb-1">{period.label}</div>
                    <div className="text-caption text-white-600">{period.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

