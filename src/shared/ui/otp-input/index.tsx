"use client";

import { useRef, useEffect, useState, type InputHTMLAttributes } from "react";

interface OtpInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function OtpInput({ length = 6, value, onChange, error, ...props }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const [hasBlurred, setHasBlurred] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Синхронизируем внутреннее состояние с внешним value
    if (value) {
      const newOtp = value.split("").slice(0, length);
      const paddedOtp = [...newOtp, ...Array(length - newOtp.length).fill("")];
      setOtp(paddedOtp);
    } else {
      setOtp(Array(length).fill(""));
    }
  }, [value, length]);

  useEffect(() => {
    // Автофокус на первый инпут при монтировании
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const showError = hasBlurred && error;

  const handleChange = (index: number, newValue: string) => {
    // Разрешаем только цифры
    const digit = newValue.replace(/\D/g, "");
    
    if (digit.length > 1) {
      // Если вставлено несколько символов, берем только первый
      const firstDigit = digit[0];
      const newOtp = [...otp];
      newOtp[index] = firstDigit;
      setOtp(newOtp);
      
      // Переходим к следующему инпуту
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      
      onChange(newOtp.join(""));
    } else if (digit.length === 1) {
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      
      // Переходим к следующему инпуту
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      
      onChange(newOtp.join(""));
    } else {
      // Удаление символа
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      onChange(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      // Если текущий инпут пустой и нажали Backspace, переходим к предыдущему
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    const newOtp = [...otp];
    
    // Заполняем начиная с текущего индекса
    for (let i = 0; i < pastedData.length && (index + i) < length; i++) {
      newOtp[index + i] = pastedData[i];
    }
    
    setOtp(newOtp);
    onChange(newOtp.join(""));
    
    // Фокус на следующий после последнего заполненного инпута
    const nextIndex = Math.min(index + pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="w-full">
      <div className="flex gap-3 w-full min-w-0">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(e, index)}
            onBlur={() => setHasBlurred(true)}
            className={`flex-1 min-w-0 h-14 text-center text-display bg-transparent hover:bg-onsurface-950 border rounded-xl text-white-900 focus:outline-none focus:border-white-900 focus:shadow-[0_0_0_1px_rgba(255,255,255,1)] transition-all ${
              showError ? "border-redhaze text-redhaze" : "border-onsurface-800"
            }`}
            {...props}
          />
        ))}
      </div>
      {showError && (
        <p className="mt-1 text-small text-redhaze text-left">{error}</p>
      )}
    </div>
  );
}

