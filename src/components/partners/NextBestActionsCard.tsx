import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NextBestAction } from "@/lib/partner-next-actions";

interface NextBestActionsCardProps {
  actions: NextBestAction[];
}

const DIMENSION_LABEL: Record<NextBestAction["improves"], string> = {
  relationship: "Relationship Health",
  momentum: "Business Momentum",
  engagement: "Operational Engagement",
};

const PRIORITY_STYLES: Record<NextBestAction["priority"], string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

const PRIORITY_LABEL: Record<NextBestAction["priority"], string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

export function NextBestActionsCard({ actions }: NextBestActionsCardProps) {
  const visible = actions.slice(0, 3);
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Next Best Actions</h3>
      </div>

      {visible.length === 0 ? (
        <p className="text-[13px] text-muted-foreground leading-snug">
          No immediate actions recommended. Continue maintaining regular engagement
          with this partner.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border/60 px-3 py-2 space-y-1 hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span className="text-[13px] font-medium text-foreground leading-snug">
                    {a.title}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${PRIORITY_STYLES[a.priority]}`}
                >
                  {PRIORITY_LABEL[a.priority]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug pl-5">
                {a.why}
              </p>
              <div className="pl-5">
                <Badge variant="outline" className="text-[10px] font-normal h-4 px-1.5">
                  {DIMENSION_LABEL[a.improves]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
