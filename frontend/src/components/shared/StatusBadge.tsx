import { STATUS_DOTS, STATUS_STYLES, type StatusTone } from "../../lib/blood";

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  dot?: boolean;
  className?: string;
}

export default function StatusBadge({
  tone,
  label,
  dot = true,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[tone]} ${className}`}
      aria-label={label}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[tone]}`} />}
      {label}
    </span>
  );
}
