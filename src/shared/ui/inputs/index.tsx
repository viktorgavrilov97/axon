import { type InputHTMLAttributes, forwardRef, useState, useEffect, useLayoutEffect, useRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  floatingLabel?: boolean; // Apple-style floating label
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", onFocus, onBlur, floatingLabel = false, placeholder, value, autoFocus, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(autoFocus || false);
    const [hasBlurred, setHasBlurred] = useState(false);
    const [hasValue, setHasValue] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const showError = hasBlurred && error;

    // Track if input has value
    useEffect(() => {
      const inputValue = value !== undefined ? String(value) : (props.defaultValue !== undefined ? String(props.defaultValue) : "");
      setHasValue(inputValue.length > 0);
    }, [value, props.defaultValue]);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Update hasValue based on actual input value when focusing
      setHasValue(e.target.value.length > 0);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasBlurred(true);
      // Update hasValue based on actual input value
      setHasValue(e.target.value.length > 0);
      if (onBlur) onBlur(e);
    };

    // For floating label, use label as placeholder if no placeholder provided
    // But don't show placeholder when floating label is active and should float
    const shouldFloat = floatingLabel && (isFocused || hasValue);
    const displayPlaceholder = floatingLabel && label ? (shouldFloat ? "" : label) : placeholder;

    if (floatingLabel && label) {
      return (
        <div className="w-full">
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
              autoComplete="off"
              autoFocus={autoFocus}
              className={`w-full h-20 px-4 bg-transparent hover:bg-onsurface-950 border rounded-2xl text-white-900 text-body placeholder:text-transparent focus:outline-none focus:border-white-900 focus:shadow-[0_0_0_1px_rgba(255,255,255,1)] transition-all ${
                shouldFloat ? "pt-10 pb-4" : "py-0"
              } ${
                showError && !isFocused ? "border-redhaze" : "border-onsurface-800"
              } ${className}`}
              placeholder={displayPlaceholder}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              {...props}
            />
            <label
              className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out ${
                shouldFloat
                  ? "top-4 text-caption text-white-600"
                  : "top-1/2 -translate-y-1/2 text-body text-white-600"
              }`}
            >
              {label}
            </label>
          </div>
          {showError && (
            <p className="mt-1 text-small text-redhaze">{error}</p>
          )}
        </div>
      );
    }

    // Default behavior (non-floating label)
    return (
      <div className="w-full">
        {label && (
          <label className="block text-caption text-white-900 font-medium mb-3">
            {label}
          </label>
        )}
        <input
          ref={ref}
          autoComplete="off"
          className={`w-full h-14 px-4 bg-transparent hover:bg-onsurface-950 border rounded-xl text-white-900 text-body placeholder:text-white-600 focus:outline-none focus:border-white-900 focus:shadow-[0_0_0_1px_rgba(255,255,255,1)] transition-all ${
            showError && !isFocused ? "border-redhaze" : "border-onsurface-800"
          } ${className}`}
          placeholder={placeholder}
          value={value}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            setHasBlurred(true);
            if (onBlur) onBlur(e);
          }}
          onChange={handleChange}
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

