/**
 * Password validation and hashing module
 * 
 * Password Requirements:
 * - Minimum length: 8 characters
 * - Maximum length: 72 characters (bcrypt limitation)
 * - Must contain uppercase letters (A-Z)
 * - Must contain lowercase letters (a-z)
 * - Must contain at least one special character (!@#$%^&*()-_=+[]{};:,<.>/?\|)
 * - Allowed characters: a-z, A-Z, 0-9, !@#$%^&*()-_=+[]{};:,<.>/?\|
 * - Password must not be in common password blacklist
 * - Password must not match email or username
 */

import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

// Password validation result
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Allowed characters regex: a-z, A-Z, 0-9, !@#$%^&*()-_=+[]{};:,<.>/?\|
const ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9!@#$%^&*()\-_=+\[\]{};:,<.>/?\\|]+$/;

// Character category regexes
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_SPECIAL_CHAR = /[!@#$%^&*()\-_=+\[\]{};:,<.>/?\\|]/;

// Minimum and maximum length
const MIN_LENGTH = 8;
const MAX_LENGTH = 72;

// Load common passwords blacklist
let commonPasswordsSet: Set<string> | null = null;

function loadCommonPasswords(): Set<string> {
  if (commonPasswordsSet) {
    return commonPasswordsSet;
  }

  try {
    const filePath = join(process.cwd(), "src/modules/identity/lib/common-passwords.txt");
    const content = readFileSync(filePath, "utf-8");
    const passwords = content
      .split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.length > 0);
    commonPasswordsSet = new Set(passwords);
    return commonPasswordsSet;
  } catch (error) {
    console.error("Failed to load common passwords list:", error);
    // Return empty set if file not found - validation will still work
    commonPasswordsSet = new Set();
    return commonPasswordsSet;
  }
}

/**
 * Validates password according to security requirements
 * 
 * @param password - Password to validate
 * @param email - User email (optional, for checking if password matches email)
 * @param username - Username (optional, for checking if password matches username)
 * @returns PasswordValidationResult with validation status and errors
 */
export function validatePassword(
  password: string,
  email?: string,
  username?: string
): PasswordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check length
  if (password.length < MIN_LENGTH) {
    errors.push("Пароль слишком короткий. Минимум 8 символов.");
  }

  if (password.length > MAX_LENGTH) {
    errors.push(`Пароль должен быть не более ${MAX_LENGTH} символов`);
  }

  // Check allowed characters
  if (!ALLOWED_CHARS_REGEX.test(password)) {
    errors.push(
      "Пароль содержит недопустимые символы. Разрешены только буквы, цифры и специальные символы (!@#$%^&*()-_=+[]{};:,<.>/?\\|)"
    );
  }

  // Check for uppercase letters
  if (!HAS_UPPERCASE.test(password)) {
    errors.push("Добавьте заглавную букву.");
  }

  // Check for lowercase letters
  if (!HAS_LOWERCASE.test(password)) {
    errors.push("Добавьте строчную букву.");
  }

  // Check for special characters
  if (!HAS_SPECIAL_CHAR.test(password)) {
    errors.push("Добавьте специальный символ.");
  }

  // Check against common passwords blacklist
  const commonPasswords = loadCommonPasswords();
    if (commonPasswords.has(password.toLowerCase())) {
      errors.push("Этот пароль слишком распространён. Выберите другой пароль");
    }

    // Check if password matches email
    if (email) {
      const emailLocalPart = email.split("@")[0].toLowerCase();
      if (password.toLowerCase().includes(emailLocalPart) || emailLocalPart.includes(password.toLowerCase())) {
        errors.push("Пароль не должен быть похож на ваш email");
      }
    }

    // Check if password matches username
    if (username) {
      const usernameLower = username.toLowerCase();
      if (password.toLowerCase().includes(usernameLower) || usernameLower.includes(password.toLowerCase())) {
        errors.push("Пароль не должен быть похож на ваше имя пользователя");
      }
    }

  // Warnings (non-blocking)
  if (password.length < 12) {
    warnings.push("Consider using a longer password (12+ characters) for better security");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Hashes password using bcrypt with cost factor 12
 * 
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // OWASP recommended minimum
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verifies password against hash
 * 
 * @param password - Plain text password
 * @param hash - Bcrypt hash
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Synchronous version of hashPassword (for compatibility)
 * Note: This is less secure as it blocks the event loop
 * Prefer using hashPassword() async version
 */
export function hashPasswordSync(password: string): string {
  const saltRounds = 12;
  return bcrypt.hashSync(password, saltRounds);
}

/**
 * Synchronous version of verifyPassword (for compatibility)
 */
export function verifyPasswordSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

