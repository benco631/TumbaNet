import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** colour theme for the icon well — defaults to purple accent */
  variant?: "default" | "gold" | "muted";
}

const ICON_WELL_STYLES: Record<NonNullable<EmptyStateProps["variant"]>, string> = {
  default: "bg-tumba-500/10 border border-tumba-500/15",
  gold:    "bg-yellow-500/10 border border-yellow-500/15",
  muted:   "bg-white/[0.04] border border-white/[0.06]",
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
  variant = "default",
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      <div className={`empty-state-icon ${ICON_WELL_STYLES[variant]}`}>
        {icon}
      </div>
      <p className="text-base font-bold text-[var(--text-primary)] leading-snug">{title}</p>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
