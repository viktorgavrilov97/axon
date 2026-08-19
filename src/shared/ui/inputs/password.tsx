"use client";

import { useState, useEffect, useLayoutEffect, useRef, type InputHTMLAttributes, forwardRef } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { Input } from "./index";
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
  floatingLabel?: boolean; // Apple-style floating label
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
      floatingLabel = false,
      autoFocus,
      onBlur: propsOnBlur,
      onFocus: propsOnFocus,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(autoFocus || false);
    const [internalPassword, setInternalPassword] = useState("");
    const [hasBlurred, setHasBlurred] = useState(false);
    const [localValidationError, setLocalValidationError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const hasValidationErrors = validationErrors.length > 0;
    const hasValidationWarnings = validationWarnings.length > 0;
    
    // Get password value - prioritize passwordValue prop, then props.value, then internal state
    const currentPassword = passwordValue !== undefined 
      ? passwordValue 
      : (props.value !== undefined ? String(props.value) : internalPassword);

    // Check if input has value for floating label
    const hasValue = currentPassword.length > 0;
    const shouldFloat = floatingLabel && (isFocused || hasValue);

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

    // Check if input is focused on mount (for autoFocus)
    useLayoutEffect(() => {
      if (autoFocus && inputRef.current) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (inputRef.current && document.activeElement === inputRef.current) {
            setIsFocused(true);
          }
        });
      }
    }, [autoFocus]);

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
      
      // Call original onBlur if provided
      if (propsOnBlur) {
        propsOnBlur(e);
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
        {label && !floatingLabel && (
          <label className="block text-caption text-white-900 font-medium mb-3">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            autoFocus={autoFocus}
            className={`w-full h-20 px-4 pr-12 bg-transparent hover:bg-onsurface-950 border rounded-2xl text-white-900 text-body placeholder:text-transparent focus:outline-none focus:border-white-900 focus:shadow-[0_0_0_1px_rgba(255,255,255,1)] transition-all ${
              shouldFloat ? "pt-10 pb-4" : "py-0"
            } ${
              displayError && !isFocused ? "border-redhaze" : "border-onsurface-800"
            } ${className}`}
            placeholder={floatingLabel && label ? (shouldFloat ? "" : label) : props.placeholder}
            onFocus={(e) => {
              setIsFocused(true);
              // Update hasValue based on actual input value when focusing
              const currentVal = e.target.value;
              if (propsOnFocus) {
                propsOnFocus(e);
              }
            }}
            onBlur={handleBlur}
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
          {floatingLabel && label && (
            <label
              className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out ${
                shouldFloat
                  ? "top-4 text-caption text-white-600"
                  : "top-1/2 -translate-y-1/2 text-body text-white-600"
              }`}
            >
              {label}
            </label>
          )}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
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
              8+ characters
              </li>
            <li className={/[A-Z]/.test(currentPassword) ? "text-mint" : "text-white-600"}>
              Uppercase letter
              </li>
            <li className={/[a-z]/.test(currentPassword) ? "text-mint" : "text-white-600"}>
              Lowercase letter
              </li>
            <li className={/[!@#$%^&*()\-_=+\[\]{};:,<.>/?\\|]/.test(currentPassword) ? "text-mint" : "text-white-600"}>
              Special character
              </li>
            </ul>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

