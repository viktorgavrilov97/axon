/**
 * Client-side password validation
 * Lightweight version for real-time validation in forms
 * Full validation happens on server
 */

// Allowed characters regex
const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{};:,<.>/?\\|]+$/;

// Character category regexes
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_SPECIAL_CHAR = /[!@#$%^&*()\-_=+\[\]{};:,<.>/?\\|]/;

const MIN_LENGTH = 8;
const MAX_LENGTH = 72;

export interface ClientPasswordValidation {
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

/**
 * Client-side password validation (lightweight, for UX)
 * Full validation with blacklist happens on server
 */
export function validatePasswordClient(
  password: string,
  email?: string
): ClientPasswordValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Only validate if password has content
  if (password.length === 0) {
    return {
      errors: [],
      warnings: [],
      isValid: true,
    };
  }

  if (password.length < MIN_LENGTH) {
    errors.push("Password is too short. Minimum 8 characters.");
  }

  if (password.length > MAX_LENGTH) {
    errors.push(`Password must be no more than ${MAX_LENGTH} characters`);
  }

  if (!ALLOWED_CHARS_REGEX.test(password)) {
    errors.push(
      "Password contains invalid characters. Only letters, numbers and special characters (!@#$%^&*()-_=+[]{};:,<.>/?\\|) are allowed"
    );
  }

  // Check for uppercase letters
  if (!HAS_UPPERCASE.test(password)) {
    errors.push("Add an uppercase letter.");
  }

  // Check for lowercase letters
  if (!HAS_LOWERCASE.test(password)) {
    errors.push("Add a lowercase letter.");
  }

  // Check for special characters
  if (!HAS_SPECIAL_CHAR.test(password)) {
    errors.push("Add a special character.");
  }

  if (email) {
    const emailLocalPart = email.split("@")[0].toLowerCase();
    if (password.toLowerCase().includes(emailLocalPart) || emailLocalPart.includes(password.toLowerCase())) {
      errors.push("Password should not be similar to your email");
    }
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

