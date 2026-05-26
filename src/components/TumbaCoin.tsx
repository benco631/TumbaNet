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

/** Large — for wallet / balance / hero display (icon 48px, with glow animation) */
export function CoinAmountLg({ amount, className = "", showLabel = true }: CoinAmountProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="animate-coin-glow shrink-0">
        <TumbaCoinIcon size={48} />
      </span>
      <span className="text-2xl font-extrabold text-tumba-300 tabular-nums">
        {formatNumber(amount)}
      </span>
      {showLabel && (
        <span className="text-xs text-tumba-500/70 font-bold uppercase tracking-widest leading-none mt-1 self-end mb-0.5">
          TC
        </span>
      )}
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
      className={`relative overflow-hidden p-5 rounded-2xl border border-tumba-500/28
        bg-gradient-to-br from-tumba-900/65 via-[var(--bg-card)] to-[var(--bg-card)]
        animate-neon-pulse
        ${className}`}
    >
      {/* Decorative glows */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-tumba-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-neon-pink/[0.05] blur-2xl pointer-events-none" />

      <p className="section-label mb-2.5 relative z-10">
        TumbaCoins Balance
      </p>
      <CoinAmountLg amount={balance} className="relative z-10" />

      {totalSpent !== undefined && (
        <div className="flex gap-6 mt-4 pt-3.5 border-t border-tumba-500/15 relative z-10">
          <div>
            <p className="section-label mb-1">Spent</p>
            <CoinAmountSm amount={totalSpent} />
          </div>
          <div>
            <p className="section-label mb-1">Lifetime</p>
            <CoinAmountSm amount={balance + totalSpent} />
          </div>
        </div>
      )}
    </div>
  );
}
