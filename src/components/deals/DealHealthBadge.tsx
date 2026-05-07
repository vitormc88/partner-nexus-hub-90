import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { HEALTH_META, type DealHealthResult } from "@/lib/deal-health";
import { cn } from "@/lib/utils";
import { Lightbulb, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  result: DealHealthResult;
  size?: "xs" | "sm";
  className?: string;
  showAction?: boolean;
}

/**
 * Compact health badge with hover-card explainability + next-best action.
 * Used in Pipeline kanban cards and any list that surfaces health.
 */
export function DealHealthBadge({ result, size = "xs", className, showAction = true }: Props) {
  const meta = HEALTH_META[result.health];
  const sizeCls = size === "xs"
    ? "px-1.5 py-0 text-[9.5px]"
    : "px-2 py-0.5 text-[11px]";
  const dotCls = size === "xs" ? "h-1.5 w-1.5" : "h-2 w-2";
  const isPositive = result.health === "Hot" || result.health === "Healthy";

  return (
    <HoverCard openDelay={120} closeDelay={60}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border font-medium cursor-help",
            meta.chip,
            sizeCls,
            className
          )}
        >
          <span className={cn("rounded-full", dotCls, meta.dot)} />
          {meta.label}
        </span>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold", meta.chip)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
          <span className="text-[10.5px] text-muted-foreground tabular-nums">
            {result.daysInStage}d in stage
            {result.daysSinceActivity !== null && ` · last activity ${result.daysSinceActivity}d ago`}
          </span>
        </div>

        {isPositive && result.positives.length > 0 && (
          <ul className="space-y-1">
            {result.positives.slice(0, 4).map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-foreground">
                <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-600 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}

        {!isPositive && result.reasons.length > 0 && (
          <ul className="space-y-1">
            {result.reasons.slice(0, 5).map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-foreground">
                <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-600 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}

        {showAction && result.suggestedAction && (
          <div className="pt-2 border-t flex items-start gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
            <div className="text-[11.5px]">
              <p className="font-semibold text-foreground">Next best action</p>
              <p className="text-muted-foreground">
                {result.suggestedAction.label}
                {result.suggestedAction.hint && <span className="opacity-70"> · {result.suggestedAction.hint}</span>}
              </p>
            </div>
          </div>
        )}

        {result.probabilityAdjustment !== 0 && (
          <div className="pt-2 border-t text-[10.5px] text-muted-foreground tabular-nums">
            Probability {result.baseProbability}%
            <span className={cn("mx-1 font-semibold", result.probabilityAdjustment > 0 ? "text-emerald-600" : "text-red-600")}>
              {result.probabilityAdjustment > 0 ? "+" : ""}{result.probabilityAdjustment}%
            </span>
            → effective <span className="font-semibold text-foreground">{result.effectiveProbability}%</span>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
