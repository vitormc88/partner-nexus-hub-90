import { type RenewalStatus, getRenewalLabel } from "@/data/clients-mock-data";
import { cn } from "@/lib/utils";

const statusStyles: Record<RenewalStatus, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  red: "bg-red-50 text-red-700 border-red-200",
  grey: "bg-muted text-muted-foreground border-border",
};

const dotStyles: Record<RenewalStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  grey: "bg-muted-foreground/50",
};

export function RenewalBadge({ status }: { status: RenewalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[status])} />
      {getRenewalLabel(status)}
    </span>
  );
}
