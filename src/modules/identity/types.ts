export type OtpType = "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "TWO_FACTOR";

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ResetPasswordFormData {
  email?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
}

