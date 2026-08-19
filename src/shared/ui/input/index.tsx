import { type InputHTMLAttributes, forwardRef, useState } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasBlurred, setHasBlurred] = useState(false);

    const showError = hasBlurred && error;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-body text-white-900 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          autoComplete="off"
          className={`w-full px-4 py-2 bg-surface-900 hover:bg-onsurface-950 border text-white-900 text-body focus:outline-none focus:border-white-800 transition-all ${
            showError && !isFocused ? "border-redhaze" : "border-white-500"
          } ${className}`}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            setHasBlurred(true);
            if (onBlur) onBlur(e);
          }}
          {...props}
        />
        {showError && (
          <p className="mt-1 text-small text-redhaze">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

