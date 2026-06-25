import { Info, Check, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { HealthFactor } from "@/lib/partner-health-config";
import { healthBand } from "@/lib/partner-health-config";

interface PartnerHealthCardProps {
  score: number;
  factors?: HealthFactor[];
  /** Backward-compatible plain text fallbacks. */
  positiveFactors?: string[];
  negativeFactors?: string[];
}

const IMPACT_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

function rank(factors: HealthFactor[], type: "positive" | "negative", max = 3) {
  return [...factors]
    .filter((f) => f.type === type)
    .sort((a, b) => (IMPACT_RANK[b.impact] ?? 0) - (IMPACT_RANK[a.impact] ?? 0))
    .slice(0, max);
}

export function PartnerHealthCard({
  score,
  factors = [],
  positiveFactors = [],
  negativeFactors = [],
}: PartnerHealthCardProps) {
  const band = healthBand(score);
  const label = band === "healthy" ? "Healthy" : band === "moderate" ? "Moderate" : "At Risk";
  const color =
    band === "healthy"
      ? "hsl(var(--success))"
      : band === "moderate"
      ? "hsl(var(--warning))"
      : "hsl(var(--destructive))";

  const positives = rank(factors, "positive");
  const negatives = rank(factors, "negative");

  // Fallback to plain text arrays when structured factors are absent.
  const positiveLabels = positives.length
    ? positives.map((f) => f.label)
    : positiveFactors.slice(0, 3);
  const negativeLabels = negatives.length
    ? negatives.map((f) => f.label)
    : negativeFactors.slice(0, 3);

  return (
    <div className="bg-card rounded-xl border shadow-sm p-5 space-y-5">
      {/* ── Score header ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Partner Health</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                Partner Health reflects the overall strength of this partnership.
                It combines relationship quality, business momentum and
                operational engagement, and updates continuously as the
                partnership evolves.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-2xl font-bold tabular-nums">
            {score}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </span>
          <Badge variant="outline" className="ml-2">{label}</Badge>
        </div>

        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{ width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* ── What's helping ───────────────────────────────────────── */}
      <FactorSection
        title="What's helping"
        tone="positive"
        items={positiveLabels}
        emptyText="No strong positive indicators yet."
      />

      {/* ── Needs attention ──────────────────────────────────────── */}
      <FactorSection
        title="Needs attention"
        tone="negative"
        items={negativeLabels}
        emptyText="No immediate concerns detected."
      />

      {/* Recommended Actions slot will be added here in a future iteration. */}
    </div>
  );
}

interface FactorSectionProps {
  title: string;
  tone: "positive" | "negative";
  items: string[];
  emptyText: string;
}

function FactorSection({ title, tone, items, emptyText }: FactorSectionProps) {
  const Icon = tone === "positive" ? Check : AlertTriangle;
  const iconColor = tone === "positive" ? "text-success" : "text-warning";

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((label, i) => (
            <li key={`${tone}-${i}`} className="flex items-start gap-2 text-sm text-foreground">
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${iconColor}`} />
              <span className="leading-snug">{label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
