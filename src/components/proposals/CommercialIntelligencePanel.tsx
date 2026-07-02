import { useMemo } from "react";
import { Sparkles, AlertTriangle, TrendingUp, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CommercialContext } from "./CreateProposalDialog";

/**
 * Sprint I.5 — Proposal Builder Intelligence.
 * Purely informational overlays for the Proposal Builder when launched from
 * the Commercial Workspace. Does NOT change pricing, licensing, generation,
 * or any commercial calculation.
 */

interface Props {
  ctx: CommercialContext;
  /** Live totalRecurring computed by the Proposal Builder (Year 2+ recurring). */
  newRecurring: number;
  /** Which slot to render: banners at the top, or the summary card on Preview. */
  slot: "banners" | "summary";
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function CommercialIntelligencePanel({ ctx, newRecurring, slot }: Props) {
  const snap = ctx.existingCustomer || {};
  const license: any = snap.license || {};
  const contract: any = snap.contract || {};

  const currentARR = useMemo(() => {
    return (
      num(contract.recurring_contract_value) ||
      num(license.recurring_contract_value) ||
      num(contract.annual_value) ||
      num(contract.total_value) ||
      0
    );
  }, [contract, license]);

  const billingFrequency: string | null =
    contract.billing_frequency || license.billing_frequency || null;
  const deployment: string | null =
    license.deployment_type || contract.deployment_type || license.hosting || null;

  const daysToRenewal = useMemo(() => {
    if (!snap.renewalDate) return null;
    const ms = new Date(snap.renewalDate).getTime() - Date.now();
    if (!Number.isFinite(ms)) return null;
    return Math.ceil(ms / 86400000);
  }, [snap.renewalDate]);

  const showRenewalMerge =
    daysToRenewal !== null && daysToRenewal >= 0 && daysToRenewal <= 60 && ctx.mode !== "renew_agreement";

  const currentPlan = ctx.presetPlan;
  const currentModuleNames: string[] = (snap.modules || [])
    .map((m: any) => (m?.module_name || m?.name || "").toString().toLowerCase())
    .filter(Boolean);

  // Suggest Business KeepIT when customer is on Professional with several modules
  // stacked (Stock + Purchase Orders) → a Business tier is typically cheaper.
  const upgradeSuggestion = useMemo(() => {
    if (ctx.mode === "upgrade_license") return null;
    if (ctx.presetProductFamily !== "Professional") return null;
    const hasStock = currentModuleNames.some((n) => n.includes("stock"));
    const hasPurchase = currentModuleNames.some((n) => n.includes("purchase"));
    if (currentPlan === 3 || (hasStock && hasPurchase)) {
      return "This customer stacks multiple Professional modules. Business KeepIT may reduce total cost while consolidating features.";
    }
    return null;
  }, [ctx.mode, ctx.presetProductFamily, currentPlan, currentModuleNames]);

  if (slot === "banners") {
    if (!showRenewalMerge && !upgradeSuggestion) return null;
    return (
      <div className="space-y-2">
        {showRenewalMerge && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <CalendarClock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-foreground">Renewal in {daysToRenewal} days</p>
              <p className="text-muted-foreground mt-0.5">
                This proposal can be merged into the upcoming renewal. You can continue as a standalone commercial proposal or prepare a full renewal instead.
              </p>
            </div>
          </div>
        )}
        {upgradeSuggestion && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
            <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-foreground">Upgrade opportunity</p>
              <p className="text-muted-foreground mt-0.5">{upgradeSuggestion}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // slot === "summary" — commercial summary on Preview step
  const additional = Math.max(0, num(newRecurring) - currentARR);
  const newARR = currentARR + additional;
  const fmt = (n: number) => `€${Math.round(n).toLocaleString()}`;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Commercial Summary</p>
        <Badge variant="secondary" className="ml-auto text-[10px]">Informational</Badge>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <SummaryStat label="Current ARR" value={fmt(currentARR)} />
        <SummaryStat label="Additional ARR" value={`+${fmt(additional)}`} accent />
        <SummaryStat label="New ARR" value={fmt(newARR)} strong />
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-medium text-foreground">Commercial action:</span>{" "}
          {ctx.label}
        </p>
        {(billingFrequency || deployment) && (
          <p>
            {billingFrequency && <>Billing: <span className="text-foreground">{billingFrequency}</span></>}
            {billingFrequency && deployment && " · "}
            {deployment && <>Deployment: <span className="text-foreground">{deployment}</span></>}
          </p>
        )}
        {currentARR === 0 && (
          <p className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-3 w-3" /> Current ARR not on file — this summary is a best-effort estimate.
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ label, value, accent, strong }: { label: string; value: string; accent?: boolean; strong?: boolean }) {
  return (
    <div className="rounded-md bg-background border border-border/60 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 ${strong ? "text-lg font-bold" : "text-base font-semibold"} ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
