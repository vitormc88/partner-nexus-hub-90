import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Target,
  Workflow,
  Database,
  Clock,
  Users,
  Wallet,
  Lightbulb,
} from "lucide-react";

interface Props {
  dealId: string;
}

/**
 * Compact, read-only continuity layer for opportunities promoted from a
 * qualified inbound lead. NOT a qualification engine — just a commercial
 * memory block so the seller knows why this opportunity exists and what
 * to emphasize during demo/proposal.
 */
export function QualificationSnapshot({ dealId }: Props) {
  const [open, setOpen] = useState(true);

  const { data: lead } = useQuery({
    queryKey: ["deal_source_lead", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incoming_leads")
        .select(
          "id, current_process, main_challenge, existing_system, timing_status, timing_notes, decision_status, decision_notes, budget_status, budget_notes, interest_status, interest_notes, fit_pain_identified, fit_current_process_identified, fit_urgency_identified, fit_decision_maker_identified, fit_operational_maturity, fit_system_dissatisfaction, notes"
        )
        .eq("converted_to_deal_id", dealId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!lead) return null;

  const rows: { icon: any; label: string; value: string | null | undefined }[] = [
    { icon: Target, label: "Operational pain", value: lead.main_challenge },
    { icon: Workflow, label: "Current process", value: lead.current_process },
    { icon: Database, label: "Existing system", value: lead.existing_system },
    {
      icon: Clock,
      label: "Urgency / timing",
      value: [lead.timing_status, lead.timing_notes].filter(Boolean).join(" — ") || null,
    },
    {
      icon: Users,
      label: "Decision structure",
      value: [lead.decision_status, lead.decision_notes].filter(Boolean).join(" — ") || null,
    },
    {
      icon: Wallet,
      label: "Budget context",
      value: [lead.budget_status, lead.budget_notes].filter(Boolean).join(" — ") || null,
    },
  ];

  const whyQualified: string[] = [];
  if ((lead as any).fit_pain_identified) whyQualified.push("Pain validated");
  if ((lead as any).fit_current_process_identified) whyQualified.push("Process mapped");
  if ((lead as any).fit_urgency_identified) whyQualified.push("Urgency");
  if ((lead as any).fit_decision_maker_identified) whyQualified.push("Decision maker");
  if ((lead as any).fit_operational_maturity) whyQualified.push("Operational maturity");
  if ((lead as any).fit_system_dissatisfaction) whyQualified.push("System dissatisfaction");

  // Lightweight demo/proposal guidance derived from qualification context.
  const guidance: string[] = [];
  const process = (lead.current_process || "").toLowerCase();
  const challenge = (lead.main_challenge || "").toLowerCase();
  const system = (lead.existing_system || "").toLowerCase();
  if (process.includes("excel") || process.includes("paper") || process.includes("manual")) {
    guidance.push("Emphasize visibility, planning and traceability over manual workflows.");
  }
  if (challenge.includes("visibility") || challenge.includes("report") || challenge.includes("kpi")) {
    guidance.push("Lead the demo with dashboards, KPIs and planning visibility.");
  }
  if (system.includes("none") || system === "" || system.includes("no system")) {
    guidance.push("Position as a first structured operational platform — adoption matters more than features.");
  }
  if ((lead as any).fit_urgency_identified) {
    guidance.push("Surface faster implementation and time-to-value messaging.");
  }
  if ((lead as any).fit_system_dissatisfaction) {
    guidance.push("Anticipate comparison with current system — prepare differentiation talking points.");
  }

  const hasAnyContext = rows.some((r) => !!r.value) || whyQualified.length > 0;
  if (!hasAnyContext) return null;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Conversion banner */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-success/5 rounded-t-xl">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-success font-medium">Converted from qualified inbound lead</span>
        </div>
        <Link
          to={`/incoming-leads/${lead.id}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View original lead <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-semibold text-foreground">Qualification Snapshot</span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            {rows
              .filter((r) => !!r.value)
              .map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.label} className="flex items-start gap-2 text-xs">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-muted-foreground">{r.label}</div>
                      <div className="text-foreground leading-snug">{r.value}</div>
                    </div>
                  </div>
                );
              })}
          </div>

          {whyQualified.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1.5">Why it qualified</div>
              <div className="flex flex-wrap gap-1">
                {whyQualified.map((w) => (
                  <span
                    key={w}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {guidance.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> Demo &amp; proposal guidance
              </div>
              <ul className="space-y-1">
                {guidance.map((g) => (
                  <li key={g} className="text-xs text-foreground flex gap-1.5">
                    <span className="text-primary">›</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
