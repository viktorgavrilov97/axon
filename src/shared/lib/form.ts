import { type FieldErrors, type UseFormReturn } from "react-hook-form";

export function getFieldError<T extends Record<string, unknown>>(
  form: UseFormReturn<T>,
  field: keyof T
): string | undefined {
  const error = form.formState.errors[field as keyof typeof form.formState.errors];
  return error ? (error.message as string) : undefined;
}

export function formatFormErrors(errors: FieldErrors): string[] {
  return Object.entries(errors).map(([key, value]) => {
    if (value?.message) return `${key}: ${value.message}`;
    return `${key}: Invalid value`;
  });
}

