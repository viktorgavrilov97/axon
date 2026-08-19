# Password Requirements Documentation

## Overview

This document describes the password requirements and validation rules implemented in the Identity module, following OWASP ASVS 4.0 and NIST 800-63B guidelines.

## Requirements

### Length
- **Minimum**: 8 characters
- **Maximum**: 72 characters (bcrypt limitation)

### Allowed Characters
- Latin letters: `a-z`, `A-Z`
- Digits: `0-9`
- Special characters: `!@#$%^&*()-_=+[]{};:,<.>/?\|`

### Character Categories
- **No mandatory categories** (NIST recommendation)
- Users are not required to include uppercase, lowercase, numbers, or special characters
- This reduces password complexity while maintaining security through length and blacklist checks

### Security Checks

1. **Common Password Blacklist**
   - Password must not be in the top 10,000 most common passwords
   - List stored in: `src/modules/identity/lib/common-passwords.txt`
   - Case-insensitive comparison

2. **Email Similarity Check**
   - Password must not be similar to user's email address
   - Checks if password contains email local part or vice versa
   - Case-insensitive comparison

3. **Username Similarity Check**
   - Password must not be similar to user's username (if provided)
   - Checks if password contains username or vice versa
   - Case-insensitive comparison

## Implementation

### Server-Side Validation

**Module**: `src/modules/identity/lib/password.ts`

```typescript
validatePassword(password: string, email?: string, username?: string): PasswordValidationResult
```

- Performs full validation including blacklist check
- Returns validation result with errors and warnings
- Used in: registration, password change, password reset

### Client-Side Validation

**Module**: `src/shared/lib/password-validation.ts`

```typescript
validatePasswordClient(password: string, email?: string): ClientPasswordValidation
```

- Lightweight validation for real-time UX feedback
- Does not include blacklist check (performed on server)
- Used in forms for immediate feedback

### Zod Schema

**Module**: `src/shared/lib/validations.ts`

- Validates length and allowed characters
- Full validation with blacklist happens in password.ts module

### Password Hashing

- **Algorithm**: bcrypt
- **Cost Factor**: 12 (OWASP recommended minimum)
- **Functions**:
  - `hashPassword(password: string): Promise<string>` - Async hashing
  - `verifyPassword(password: string, hash: string): Promise<boolean>` - Async verification
  - `hashPasswordSync(password: string): string` - Sync hashing (for compatibility)
  - `verifyPasswordSync(password: string, hash: string): boolean` - Sync verification (for compatibility)

## Security Features

### Session Invalidation
When a password is changed:
- All active sessions for the user are invalidated
- User must log in again with new password
- Implemented by deleting all Session records for the user

### Email Notifications
When a password is changed:
- Email notification is sent to user
- Includes security warning if change was unauthorized
- Notifies about session invalidation

### Rate Limiting
- Recommended: Implement rate limiting per IP and per email
- Prevents brute force attacks
- Should be implemented at API/middleware level

## UX Features

### Password Input Component
**Module**: `src/shared/ui/password-input/index.tsx`

Features:
- Show/hide password toggle
- Real-time validation feedback
- Requirements checklist
- Error and warning messages
- Visual indicators (green for met requirements)

### Live Validation
- Real-time validation as user types
- Immediate feedback on password strength
- Requirements checklist updates dynamically
- Warnings for weak passwords (e.g., < 12 characters)

## Files Structure

```
src/
  modules/
    identity/
      lib/
        password.ts              # Main password validation and hashing
        common-passwords.txt     # Top 10k common passwords blacklist
        email.ts                 # Email notifications
      api/
        register.ts             # Registration with password validation
        profile.ts              # Password change with validation
        reset-password.ts        # Password reset with validation
  shared/
    lib/
      password-validation.ts    # Client-side validation
      validations.ts            # Zod schemas
    ui/
      password-input/
        index.tsx               # Password input component with UX features
```

## Usage Examples

### Server-Side Validation

```typescript
import { validatePassword, hashPassword } from "@/modules/identity/lib/password";

// Validate password
const result = validatePassword(password, email, username);
if (!result.valid) {
  return { error: result.errors[0] };
}

// Hash password
const hash = await hashPassword(password);
```

### Client-Side Validation

```typescript
import { validatePasswordClient } from "@/shared/lib/password-validation";

const validation = validatePasswordClient(password, email);
if (!validation.isValid) {
  // Show errors
}
```

## Compliance

- ✅ OWASP ASVS 4.0 - Password requirements
- ✅ NIST 800-63B - Digital Identity Guidelines
- ✅ No mandatory character categories (NIST recommendation)
- ✅ Common password blacklist
- ✅ Session invalidation on password change
- ✅ Email notifications

## Future Enhancements

- [ ] Rate limiting implementation
- [ ] Password strength meter
- [ ] Password history (prevent reuse of last N passwords)
- [ ] Account lockout after failed attempts
- [ ] Integration with Have I Been Pwned API

