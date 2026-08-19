"use client";

import { useState, useEffect, type InputHTMLAttributes, forwardRef } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { Input } from "../input";
import { validatePasswordClient } from "@/shared/lib/password-validation";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  showRequirements?: boolean;
  validationErrors?: string[];
  validationWarnings?: string[];
  onValidationChange?: (isValid: boolean) => void;
  passwordValue?: string; // Explicit password value for requirements checking
  email?: string; // Email for validation (to check if password matches email)
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      error,
      className = "",
      showRequirements = false,
      validationErrors = [],
      validationWarnings = [],
      onValidationChange,
      passwordValue,
      email,
      onBlur: propsOnBlur,
      onFocus: propsOnFocus,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [internalPassword, setInternalPassword] = useState("");
    const [hasBlurred, setHasBlurred] = useState(false);
    const [localValidationError, setLocalValidationError] = useState<string | null>(null);

    const hasValidationErrors = validationErrors.length > 0;
    const hasValidationWarnings = validationWarnings.length > 0;
    
    // Get password value - prioritize passwordValue prop, then props.value, then internal state
    const currentPassword = passwordValue !== undefined 
      ? passwordValue 
      : (props.value !== undefined ? String(props.value) : internalPassword);

    // Show error only after blur - prioritize error prop, then validationErrors, then local validation
    const displayError = hasBlurred && (
      error || 
      (hasValidationErrors && validationErrors[0]) || 
      localValidationError
    );

    // Track password changes from input or props
    useEffect(() => {
      if (passwordValue !== undefined) {
        setInternalPassword(passwordValue);
      } else if (props.value !== undefined) {
        setInternalPassword(String(props.value || ""));
      }
    }, [passwordValue, props.value]);

    // Validate password on blur
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasBlurred(true);
      
      // Get the actual password value directly from the input element
      const passwordToValidate = e.target.value;
      
      // Update internal password state to keep it in sync
      setInternalPassword(passwordToValidate);
      
      // Perform local validation if password has content
      if (passwordToValidate.length > 0) {
        const validation = validatePasswordClient(passwordToValidate, email);
        if (validation.errors.length > 0) {
          setLocalValidationError(validation.errors[0]);
        } else {
          setLocalValidationError(null);
        }
      } else {
        setLocalValidationError(null);
      }
    };

    // Notify parent about validation state
    useEffect(() => {
      if (onValidationChange) {
        onValidationChange(!hasValidationErrors);
      }
    }, [hasValidationErrors, onValidationChange]);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-body text-white-900 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            className={`w-full px-4 py-2 pr-12 bg-surface-900 hover:bg-onsurface-950 border text-white-900 text-body focus:outline-none focus:border-white-800 transition-all ${
              displayError && !isFocused ? "border-redhaze" : "border-white-500"
            } ${className}`}
            onFocus={(e) => {
              setIsFocused(true);
              if (propsOnFocus) {
                propsOnFocus(e);
              }
            }}
            onBlur={(e) => {
              handleBlur(e);
              if (propsOnBlur) {
                propsOnBlur(e);
              }
            }}
            {...props}
            onChange={(e) => {
              setInternalPassword(e.target.value);
              // Clear local validation error when user starts typing (if already blurred)
              if (hasBlurred && localValidationError) {
                const newPassword = e.target.value;
                if (newPassword.length > 0) {
                  const validation = validatePasswordClient(newPassword, email);
                  if (validation.errors.length > 0) {
                    setLocalValidationError(validation.errors[0]);
                  } else {
                    setLocalValidationError(null);
                  }
                } else {
                  setLocalValidationError(null);
                }
              }
              if (props.onChange) {
                props.onChange(e);
              }
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white-600 hover:text-white-900 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <IconEyeOff size={20} stroke={1.5} />
            ) : (
              <IconEye size={20} stroke={1.5} />
            )}
          </button>
        </div>
        {displayError && (
          <p className="mt-1 text-small text-redhaze">{displayError}</p>
        )}
        {showRequirements && isFocused && currentPassword.length > 0 && (
          <ul className="mt-2 space-y-1 text-small text-white-600">
            <li className={currentPassword.length >= 8 ? "text-mint" : "text-white-600"}>
                8+ символов
              </li>
            <li className={/[A-Z]/.test(currentPassword) ? "text-mint" : "text-white-600"}>
                Заглавная буква
              </li>
            <li className={/[a-z]/.test(currentPassword) ? "text-mint" : "text-white-600"}>
                Строчная буква
              </li>
            <li className={/[!@#$%^&*()\-_=+\[\]{};:,<.>/?\\|]/.test(currentPassword) ? "text-mint" : "text-white-600"}>
                Спецсимвол
              </li>
            </ul>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

