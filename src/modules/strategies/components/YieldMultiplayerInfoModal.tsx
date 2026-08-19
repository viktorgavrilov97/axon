"use client";

import { Button } from "@/shared/ui/button";

interface YieldMultiplayerInfoModalProps {
  onClose: () => void;
}

export function YieldMultiplayerInfoModal({ onClose }: YieldMultiplayerInfoModalProps) {
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-heading text-white-900 mb-6">What is Yield Multiplayer?</h2>

      {/* Section 1: Short definition */}
      <div className="mb-6">
        <p className="text-body text-white-700">
          Yield Multiplayer is an extra daily boost on your strategies&apos; profit. It adds a bonus percent to today&apos;s total yield when your portfolio is diversified across several strategies.
        </p>
      </div>

      {/* Section 2: How it works */}
      <div className="mb-6">
        <h3 className="text-body font-medium text-white-900 mb-3">How it works</h3>
        <ul className="space-y-2 text-body text-white-700 list-disc list-inside">
          <li>Every day we calculate your base profit from all active strategies.</li>
          <li>If you have funds spread across multiple strategies, Yield Multiplayer adds an extra percentage on top of today&apos;s profit.</li>
          <li>The boost size depends on how balanced your portfolio is. A more even allocation across strategies gives a higher multiplier.</li>
          <li>The boost is applied only to today&apos;s profit — your principal and past days are not changed.</li>
          <li>You always see the extra amount from Yield Multiplayer as a separate line in your &quot;Earned&quot; section.</li>
        </ul>
      </div>

      {/* Section 3: How to activate */}
      <div className="mb-6">
        <h3 className="text-body font-medium text-white-900 mb-3">How to activate it</h3>
        <ul className="space-y-2 text-body text-white-700 list-disc list-inside">
          <li>You don&apos;t need to press any buttons to turn it on.</li>
          <li>Simply invest in more than one strategy and keep your allocations relatively balanced.</li>
          <li>As soon as your portfolio meets the conditions, Yield Multiplayer activates automatically and you&apos;ll see it on the Terminal.</li>
        </ul>
      </div>

      {/* Section 4: Important notes */}
      <div className="mb-6">
        <h3 className="text-body font-medium text-white-900 mb-3">Important notes</h3>
        <div className="space-y-2 text-body text-white-700">
          <p>The multiplier does not guarantee fixed returns and does not protect against losses.</p>
          <p>The size of the boost can change over time depending on market conditions and your portfolio structure.</p>
          <p>You can deactivate the effect at any time by closing strategies or changing your allocations.</p>
        </div>
      </div>

      {/* Close button */}
      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}


