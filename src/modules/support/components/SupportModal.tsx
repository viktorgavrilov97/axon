"use client";

import { Modal } from "@/shared/ui/modal";
import { Envelope, PaperPlaneTilt, Clock } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const handleEmailClick = () => {
    window.location.href = "mailto:1headliners@gmail.com?subject=Support Request";
  };

  const handleTelegramClick = () => {
    window.open("https://t.me/sup4859", "_blank", "noopener,noreferrer");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Support">
      <div className="space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <p className="text-body text-white-900">
            Need help? Our support team is here to assist you.
          </p>
          <p className="text-small text-white-600">
            You can reach us through the following channels:
          </p>
        </div>

        {/* Contact Methods */}
        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={handleEmailClick}
            className="w-full flex items-center justify-center gap-3 h-12"
          >
            <Envelope size={20} weight="regular" />
            <span>Email Support</span>
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleTelegramClick}
            className="w-full flex items-center justify-center gap-3 h-12"
          >
            <PaperPlaneTilt size={20} weight="regular" />
            <span>Telegram Support</span>
          </Button>
        </div>

        {/* Working Hours */}
        <div className="pt-4 border-t border-onsurface-950">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Clock size={20} weight="regular" className="text-white-600" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-small text-white-600 font-medium">Working Hours</p>
              <div className="space-y-1">
                <p className="text-body text-white-900">
                  Monday - Friday: 9:00 AM - 6:00 PM (UTC)
                </p>
                <p className="text-small text-white-600">
                  We typically respond within 24 hours during business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
