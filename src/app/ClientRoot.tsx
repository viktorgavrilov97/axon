"use client";

import { useInitialPreloader } from "@/shared/lib/useInitialPreloader";
import { InitialPreloader } from "@/shared/ui/preloader/InitialPreloader";

/**
 * Client-side root component that handles initial preloader.
 * This must be a client component to use hooks and manage state.
 */
export function ClientRoot({ children }: { children: React.ReactNode }) {
  const { visible, message } = useInitialPreloader();

  return (
    <>
      <InitialPreloader visible={visible} message={message} />
      {children}
    </>
  );
}


