"use client";

import { TradeIcon } from "@/lib/icons";

export default function TradePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-2xl bg-tumba-500/10 flex items-center justify-center">
            <TradeIcon size={40} strokeWidth={1.5} className="text-tumba-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-3">TumbaTrade</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Track investments, compete on returns, and see who&apos;s the Wolf of
          Tumba Street.
        </p>
        <div className="inline-block px-6 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)]">
          Coming Soon...
        </div>
      </div>
    </div>
  );
}
