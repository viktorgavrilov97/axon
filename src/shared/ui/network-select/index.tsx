"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CaretDown } from "@phosphor-icons/react";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";

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

type NetworkValue = "TRC20" | "ERC20" | "BEP20" | "SOLANA" | "MATIC" | "TON";

interface NetworkOption {
  value: NetworkValue;
  label: string;
  icon: string;
  description: string;
}

const networks: NetworkOption[] = [
  { 
    value: "TRC20", 
    label: "TRC-20 (Tron)", 
    icon: "/networks/tether.svg",
    description: "Lowest fees, fast confirmations, ideal for USDT transfers."
  },
  { 
    value: "ERC20", 
    label: "ERC-20 (Ethereum)", 
    icon: "/networks/erc20.svg",
    description: "Highest security and compatibility, but gas fees may be significantly higher."
  },
  { 
    value: "BEP20", 
    label: "BEP-20 (BNB Chain)", 
    icon: "/networks/binance.svg",
    description: "Low fees and fast transactions on Binance ecosystem networks."
  },
  { 
    value: "SOLANA", 
    label: "Solana (SOL)", 
    icon: "/networks/solana.svg",
    description: "Ultra-fast network with extremely low fees and near-instant settlement."
  },
  { 
    value: "MATIC", 
    label: "MATIC (Polygon)", 
    icon: "/networks/polygon.svg",
    description: "Low-cost Ethereum scaling network with stable and quick transfers."
  },
  { 
    value: "TON", 
    label: "TON", 
    icon: "/networks/ton_symbol.svg",
    description: "Very low fees and instant confirmations via The Open Network."
  },
];

interface NetworkSelectProps {
  value: NetworkValue;
  onChange: (value: NetworkValue) => void;
  allowedNetworks?: NetworkValue[];
  disabled?: boolean;
  error?: string;
}

export function NetworkSelect({ value, onChange, allowedNetworks, disabled, error }: NetworkSelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const availableNetworks =
    allowedNetworks && allowedNetworks.length > 0
      ? networks.filter((n) => allowedNetworks.includes(n.value))
      : networks;

  const selectedNetwork =
    availableNetworks.find((n) => n.value === value) || availableNetworks[0] || networks[0];

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

  const handleSelect = (networkValue: NetworkValue) => {
    onChange(networkValue);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="w-full relative">
        <button
          type="button"
          onClick={() => !disabled && setIsModalOpen(true)}
          disabled={disabled}
          className={`w-full h-14 px-4 pr-12 bg-transparent hover:bg-onsurface-950 border rounded-xl text-body text-white-900 focus:outline-none focus:border-white-900 focus:shadow-[0_0_0_1px_rgba(255,255,255,1)] transition-all flex items-center gap-3 ${
            error ? "border-redhaze" : "border-onsurface-800"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <NetworkIcon src={selectedNetwork.icon} alt={selectedNetwork.label} size={20} />
            <span className="text-body text-white-900 truncate">{selectedNetwork.label}</span>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <CaretDown
              size={16}
              weight="regular"
              className="text-white-700"
            />
          </div>
        </button>

        {error && (
          <p className="mt-2 text-caption text-redhaze">{error}</p>
        )}
      </div>

      {/* Network Selection Modal */}
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
              <h2 className={MODAL_STYLES.title}>Select Network</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className={MODAL_STYLES.closeButton}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {availableNetworks.map((network) => (
                <button
                  key={network.value}
                  type="button"
                  onClick={() => handleSelect(network.value)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-all rounded-xl ${
                    value === network.value
                      ? "bg-onsurface-900 text-white-900"
                      : "text-white-900 hover:bg-onsurface-900"
                  }`}
                >
                  <div className="mt-0.5">
                    <NetworkIcon src={network.icon} alt={network.label} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body text-white-900 mb-1">{network.label}</div>
                    <div className="text-caption text-white-600">{network.description}</div>
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

