"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CaretDown } from "@phosphor-icons/react";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { getCurrenciesAction, type OxaPayCurrency } from "@/modules/wallet/api/get-currencies";

function CurrencyIcon({ code, size = 20 }: { code: string; size?: number }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Map currency codes to icon paths
  const iconMap: Record<string, string> = {
    BTC: "/networks/binance.svg",
    ETH: "/networks/erc20.svg",
    USDT: "/networks/tether.svg",
    USDC: "/networks/usdc.svg",
    BNB: "/networks/bnb.svg",
    SOL: "/networks/solana.svg",
    TRX: "/networks/trx.svg",
    MATIC: "/networks/polygon.svg",
    TON: "/networks/ton_symbol.svg",
    LTC: "/networks/ltc.svg",
    DOGE: "/networks/doge.svg",
    XRP: "/networks/xrp.svg",
    BCH: "/networks/bch.svg",
    DAI: "/networks/dai.svg",
    DOGS: "/networks/dogs.svg",
    SHIB: "/networks/shib.svg",
    XMR: "/networks/xmr.svg",
    ADA: "/networks/binance.svg",
    DOT: "/networks/binance.svg",
    AVAX: "/networks/binance.svg",
    LINK: "/networks/erc20.svg",
    UNI: "/networks/erc20.svg",
    ATOM: "/networks/binance.svg",
    ALGO: "/networks/binance.svg",
    NEAR: "/networks/binance.svg",
  };

  // Map currency codes to colors
  const colorMap: Record<string, string> = {
    BCH: "#8DC351",
    BNB: "#F3BA2F",
    DAI: "#F4B731",
    DOGE: "#C2A633",
    DOGS: "#6E56CF",
    LTC: "#345D9D",
    SHIB: "#E84142",
    TRX: "#E50914",
    USDC: "#2775CA",
    XMR: "#FF6600",
    XRP: "#23292F",
  };

  const iconSrc = iconMap[code] || "/networks/binance.svg";
  const color = colorMap[code.toUpperCase()];

  return (
    <div 
      className="flex-shrink-0 relative rounded-full" 
      style={{ 
        width: size, 
        height: size,
        backgroundColor: color || 'transparent',
        padding: color ? '1px' : '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {isLoading && (
        <div 
          className="absolute inset-0 bg-onsurface-800 rounded-full animate-skeleton-shimmer"
          style={{ width: size, height: size }}
        />
      )}
      {!hasError && (
        <div 
          className="relative rounded-full overflow-hidden"
          style={{ 
            width: color ? size - 2 : size, 
            height: color ? size - 2 : size 
          }}
        >
          <Image
            src={iconSrc}
            alt={code}
            width={color ? size - 2 : size}
            height={color ? size - 2 : size}
            className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </div>
      )}
      {hasError && (
        <div 
          className="w-full h-full bg-onsurface-800 rounded-full flex items-center justify-center text-white-600 text-xs"
          style={{ width: size, height: size }}
        >
          {code[0]}
        </div>
      )}
    </div>
  );
}

interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function CurrencySelect({ value, onChange, disabled, error }: CurrencySelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currencies, setCurrencies] = useState<OxaPayCurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch currencies on mount
  useEffect(() => {
    const fetchCurrencies = async () => {
      setIsLoading(true);
      try {
        const result = await getCurrenciesAction();
        if (result.success && result.currencies) {
          setCurrencies(result.currencies);
        }
      } catch (error) {
        console.error("Failed to fetch currencies:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencies();
  }, []);

  const selectedCurrency = currencies.find((c) => c.code === value) || currencies[0];

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

  const handleSelect = (currencyCode: string) => {
    onChange(currencyCode);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="w-full h-14 px-4 bg-transparent border border-onsurface-800 rounded-xl flex items-center justify-center">
        <div className="text-caption text-white-600">Loading currencies...</div>
      </div>
    );
  }

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
            {selectedCurrency && (
              <>
                <CurrencyIcon code={selectedCurrency.code} size={20} />
                <span className="text-body text-white-900 truncate">
                  {selectedCurrency.code}
                </span>
              </>
            )}
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

      {/* Currency Selection Modal */}
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
              <h2 className={MODAL_STYLES.title}>Select Currency</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className={MODAL_STYLES.closeButton}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() => handleSelect(currency.code)}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-all rounded-xl ${
                    value === currency.code
                      ? "bg-onsurface-900 text-white-900"
                      : "text-white-900 hover:bg-onsurface-900"
                  }`}
                >
                  <div className="mt-0.5">
                    <CurrencyIcon code={currency.code} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body text-white-900 mb-1">
                      {currency.code}
                    </div>
                    <div className="text-caption text-white-600">
                      {currency.code === "USDT"
                        ? currency.networks?.join(", ") || "Tether"
                        : currency.name}
                    </div>
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

