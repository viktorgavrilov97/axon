/**
 * Utility to handle Server Action errors, especially 413 (Payload Too Large)
 * 
 * Next.js returns "An unexpected response was received from the server" 
 * when Server Action receives a 413 error (Payload Too Large)
 */

export function handleServerActionError(error: unknown): {
  message: string;
  isPayloadTooLarge: boolean;
} {
  // Convert error to string for checking
  const errorString = error instanceof Error ? error.message : String(error);
  const errorLower = errorString.toLowerCase();

  // Check if it's a 413 error (Payload Too Large)
  // Next.js may return "An unexpected response was received from the server" for 413 errors
  const isPayloadTooLarge = 
    errorString.includes("Body exceeded") ||
    errorString.includes("1 MB limit") ||
    errorString.includes("bodysizelimit") ||
    errorString.includes("413") ||
    errorLower.includes("payload too large") ||
    errorLower.includes("request entity too large") ||
    // Check if error has statusCode 413
    (error instanceof Error && (error as any).statusCode === 413) ||
    // Check digest for 413
    (error instanceof Error && (error as any).digest?.includes("413")) ||
    // Next.js returns "An unexpected response was received from the server" for 413 errors
    // This is the most common case we need to handle
    errorString.includes("An unexpected response was received from the server");

  if (isPayloadTooLarge) {
    return {
      message: "File size exceeds the limit of 1 MB. Please use a smaller file.",
      isPayloadTooLarge: true,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || "An error occurred. Please try again.",
      isPayloadTooLarge: false,
    };
  }

  return {
    message: "An unexpected error occurred. Please try again.",
    isPayloadTooLarge: false,
  };
}

/**
 * Wrapper for Server Actions that handles errors gracefully
 */
export async function safeServerAction<T>(
  action: () => Promise<T>,
  onError?: (error: { message: string; isPayloadTooLarge: boolean }) => void
): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    const errorInfo = handleServerActionError(error);
    if (onError) {
      onError(errorInfo);
    }
    return null;
  }
}

