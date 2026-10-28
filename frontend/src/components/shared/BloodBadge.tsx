import type { BloodType } from "../../types";

type BloodBadgeSize = "sm" | "md" | "lg";

interface BloodBadgeProps {
  blood: BloodType;
  className?: string;
  size?: BloodBadgeSize;
}

const SIZE_CLASSES: Record<BloodBadgeSize, string> = {
  sm: "inline-flex items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-rose-400",
  md: "inline-flex items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-400",
  lg: "inline-flex items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-sm font-semibold text-rose-400",
};

export default function BloodBadge({
  blood,
  className = "",
  size = "sm",
}: BloodBadgeProps) {
  return (
    <span
      className={SIZE_CLASSES[size] ?? SIZE_CLASSES.sm + (className ? ` ${className}` : "")}
      aria-label={`Blood group ${blood}`}
    >
      {blood}
    </span>
  );
}
