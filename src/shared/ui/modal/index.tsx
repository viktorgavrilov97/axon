"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { MODAL_STYLES } from "./styles";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  // Handle ESC key press and body scale/blur
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Add modal-open class to html and body for backdrop effect
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className={MODAL_STYLES.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={MODAL_STYLES.content}
        onClick={(e) => e.stopPropagation()}
        style={{ transform: 'translateZ(0)' }}
      >
        {title && (
          <div className="flex justify-between items-center mb-6">
            <h2 className={MODAL_STYLES.title}>{title}</h2>
            <button
              onClick={onClose}
              className={MODAL_STYLES.closeButton}
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

