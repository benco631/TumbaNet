"use client";

import TumbaCoinIcon from "./TumbaCoinIcon";

// ── Animated number display ───────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString("en-US");
}

// ── Size variants ─────────────────────────────────────────────────────────

interface CoinAmountProps {
  amount: number;
  className?: string;
  showLabel?: boolean;
}

/** Small — for navbars, lists, compact stats (icon 20px) */
export function CoinAmountSm({ amount, className = "", showLabel = false }: CoinAmountProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <TumbaCoinIcon size={26} />
      <span className="text-sm font-semibold text-tumba-300 tabular-nums">
        {formatNumber(amount)}
      </span>
      {showLabel && <span className="text-[10px] text-[var(--text-secondary)] font-medium">TC</span>}
    </span>
  );
}

/** Medium — for cards, rows, profile summaries (icon 26px) */
export function CoinAmountMd({ amount, className = "", showLabel = false }: CoinAmountProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <TumbaCoinIcon size={34} />
      <span className="text-lg font-bold text-tumba-300 tabular-nums">
        {formatNumber(amount)}
      </span>
      {showLabel && <span className="text-xs text-[var(--text-secondary)] font-medium">TC</span>}
    </span>
  );
}

/** Large — for wallet / balance / hero display (icon 38px) */
export function CoinAmountLg({ amount, className = "", showLabel = true }: CoinAmountProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <TumbaCoinIcon size={48} />
      <span className="text-2xl font-extrabold text-tumba-300 tabular-nums">
        {formatNumber(amount)}
      </span>
      {showLabel && <span className="text-sm text-[var(--text-secondary)] font-medium">TC</span>}
    </span>
  );
}

// ── Gain / Loss badge ─────────────────────────────────────────────────────

interface CoinDeltaProps {
  amount: number;
  className?: string;
}

/** Shows +amount (green) or -amount (red/subdued) */
export function CoinDelta({ amount, className = "" }: CoinDeltaProps) {
  const isGain = amount > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
        isGain
          ? "text-emerald-400"
          : "text-red-400/80"
      } ${className}`}
    >
      <TumbaCoinIcon size={20} />
      <span>{isGain ? "+" : ""}{formatNumber(amount)}</span>
    </span>
  );
}

// ── Balance badge (for header bars) ───────────────────────────────────────

interface CoinBadgeProps {
  amount: number;
  className?: string;
}

/** Compact badge with glow border — for navbars and page headers */
export function CoinBadge({ amount, className = "" }: CoinBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl
        bg-tumba-500/10 border border-tumba-500/25
        shadow-[0_0_12px_rgba(192,38,211,0.08)]
        ${className}`}
    >
      <TumbaCoinIcon size={30} />
      <span className="text-base font-bold text-tumba-300 tabular-nums">
        {formatNumber(amount)}
      </span>
      <span className="text-[10px] text-tumba-400/60 font-semibold">TC</span>
    </div>
  );
}

// ── Balance Card (wallet-style) ───────────────────────────────────────────

interface BalanceCardProps {
  balance: number;
  totalSpent?: number;
  className?: string;
}

/** Premium wallet card with current balance */
export function BalanceCard({ balance, totalSpent, className = "" }: BalanceCardProps) {
  return (
    <div
      className={`relative overflow-hidden p-5 rounded-2xl border border-tumba-500/25
        bg-gradient-to-br from-tumba-900/60 via-[var(--bg-card)] to-[var(--bg-card)]
        shadow-[0_0_30px_rgba(192,38,211,0.06)]
        ${className}`}
    >
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-tumba-500/8 blur-2xl pointer-events-none" />

      <p className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-2">
        Balance
      </p>
      <CoinAmountLg amount={balance} />

      {totalSpent !== undefined && (
        <div className="flex gap-4 mt-4 pt-3 border-t border-[var(--border)]">
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Spent</p>
            <CoinAmountSm amount={totalSpent} />
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Lifetime</p>
            <CoinAmountSm amount={balance + totalSpent} />
          </div>
        </div>
      )}
    </div>
  );
}
