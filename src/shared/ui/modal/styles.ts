/**
 * Centralized modal styles configuration
 * All modals should use these constants for consistent styling
 */

export const MODAL_STYLES = {
  // Backdrop (overlay) styles - full screen, centered
  // Using z-[10000] to ensure it's above everything including WebGL contexts
  backdrop: "fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4 isolate",
  
  // Modal content container styles - centered, smaller width, with border
  // Note: transform: translateZ(0) is added inline in Modal component to create a new compositing layer
  // Using z-[10001] to ensure it's above backdrop and everything else
  // Custom background color #141414 is applied via CSS class modal-content-bg
  content: "modal-content-bg rounded-2xl border border-onsurface-950 p-4 overflow-y-auto shadow-2xl w-full max-w-md max-h-[90vh] relative z-[10001] isolate modal-content",
  
  // Title styles
  title: "text-heading text-white-900",
  
  // Close button styles
  closeButton: "text-white-700 hover:text-white-900",
  
  // Padding for modal content
  padding: "p-20",
  
  // Max width
  maxWidth: "max-w-xl",
  
  // Border radius
  borderRadius: "rounded-2xl",
  
  // Background color
  backgroundColor: "bg-surface-900",
} as const;

