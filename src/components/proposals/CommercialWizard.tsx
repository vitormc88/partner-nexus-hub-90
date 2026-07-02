import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowUpCircle, Puzzle, Plug, Users2, RefreshCcw } from "lucide-react";
import type { CommercialContext, CommercialProposalMode } from "./CreateProposalDialog";
import type { ProposalPlan } from "@/types/proposal";

/**
 * Contextual wizard shown as the first screen of the Proposal Builder when
 * launched from the Commercial Workspace. It is a shortcut: after "Continue"
 * the standard Proposal Builder appears and the user can still edit anything.
 */

const PLAN_LABEL: Record<ProposalPlan, string> = {
  1: "Professional I",
  2: "Professional II",
  3: "Professional III",
};

const ALL_MODULES = [
  "Maintenance & Costs",
  "Stock Management",
  "Purchase Orders",
  "Maintenance Requests",
  "SLA Management",
  "Advanced Reports",
  "Workflow",
];

const ALL_PLUGINS = [
  "Import Tool",
  "Workflow",
  "Advanced Reports",
  "SLA",
  "API ManWinWin",
];

export interface WizardResult {
  plan?: ProposalPlan;
  additionalWebUsers?: number;
  additionalBackofficeUsers?: number;
  selectedModules?: string[];
  selectedPlugins?: string[];
}

interface Props {
  ctx: CommercialContext;
  onContinue: (result: WizardResult) => void;
  onCancel?: () => void;
}

export function CommercialWizard({ ctx, onContinue, onCancel }: Props) {
  const snap = ctx.existingCustomer || {};
  const currentPlan = (ctx.presetPlan as ProposalPlan | undefined) ?? undefined;
  const currentWebUsers = snap.webUsers ?? ctx.presetWebUsers ?? 0;
  const currentBoUsers = snap.backofficeUsers ?? 0;
  const currentRenewal = snap.renewalDate ?? null;
  const currentLicenseLabel =
    (snap as any).licenseLabel
    || (currentPlan ? PLAN_LABEL[currentPlan] : null)
    || (snap.license as any)?.product
    || "—";

  const currentModuleNames = useMemo(
    () => (snap.modules || [])
      .map((m: any) => (m?.module_name || m?.name || m?.code || "").toString())
      .filter(Boolean),
    [snap.modules],
  );
  const currentPluginNames = useMemo(
    () => (snap.plugins || [])
      .map((p: any) => (p?.plugin_name || p?.module_name || p?.name || p?.code || "").toString())
      .filter(Boolean),
    [snap.plugins],
  );


  const availableModules = useMemo(
    () => ALL_MODULES.filter((m) => !currentModuleNames.some((cm) => cm.toLowerCase() === m.toLowerCase())),
    [currentModuleNames],
  );
  const availablePlugins = useMemo(
    () => ALL_PLUGINS.filter((p) => !currentPluginNames.some((cp) => cp.toLowerCase() === p.toLowerCase())),
    [currentPluginNames],
  );

  // Local state per mode
  const [newPlan, setNewPlan] = useState<ProposalPlan>(
    currentPlan && currentPlan < 3 ? ((currentPlan + 1) as ProposalPlan) : 3,
  );
  const [addBoUsers, setAddBoUsers] = useState(0);
  const [addWebUsers, setAddWebUsers] = useState(0);
  const [pickedModules, setPickedModules] = useState<string[]>([]);
  const [pickedPlugins, setPickedPlugins] = useState<string[]>([]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const upgradeOptions: ProposalPlan[] = (currentPlan
    ? ([1, 2, 3] as ProposalPlan[]).filter((p) => p > currentPlan)
    : ([1, 2, 3] as ProposalPlan[])) as ProposalPlan[];

  const iconFor = (mode: CommercialProposalMode) => {
    switch (mode) {
      case "upgrade_license": return ArrowUpCircle;
      case "add_modules": return Puzzle;
      case "add_plugins": return Plug;
      case "add_users": return Users2;
      case "renew_agreement": return RefreshCcw;
      default: return ArrowUpCircle;
    }
  };
  const Icon = iconFor(ctx.mode);

  const handleContinue = () => {
    switch (ctx.mode) {
      case "upgrade_license":
        onContinue({ plan: newPlan });
        break;
      case "add_users":
        onContinue({
          additionalWebUsers: addWebUsers,
          additionalBackofficeUsers: addBoUsers,
        });
        break;
      case "add_modules":
        onContinue({ selectedModules: pickedModules });
        break;
      case "add_plugins":
        onContinue({ selectedPlugins: pickedPlugins });
        break;
      case "renew_agreement":
      default:
        onContinue({});
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{ctx.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shortcut wizard for {snap.clientName || "this customer"}. You can still edit everything in the Proposal Builder afterwards.
          </p>
        </div>
      </div>

      {ctx.mode === "upgrade_license" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current License</p>
            <p className="text-lg font-semibold text-foreground mt-1">
              {currentLicenseLabel}

            </p>
          </div>
          <div>
            <Label className="text-xs">Select new license</Label>
            <Select value={String(newPlan)} onValueChange={(v) => setNewPlan(Number(v) as ProposalPlan)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(upgradeOptions.length ? upgradeOptions : ([1, 2, 3] as ProposalPlan[])).map((p) => (
                  <SelectItem key={p} value={String(p)}>{PLAN_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {upgradeOptions.length === 0 && currentPlan === 3 && (
              <p className="text-xs text-muted-foreground mt-2">Customer is already on the highest plan.</p>
            )}
          </div>
        </div>
      )}

      {ctx.mode === "add_modules" && (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Current active modules">
            {currentModuleNames.length === 0 ? (
              <p className="text-xs text-muted-foreground">No modules on file.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {currentModuleNames.map((m) => (
                  <Badge key={m} variant="secondary" className="text-[11px]">{m}</Badge>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard title="Available modules">
            {availableModules.length === 0 ? (
              <p className="text-xs text-muted-foreground">All modules already licensed.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableModules.map((m) => {
                  const on = pickedModules.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPickedModules(toggle(pickedModules, m))}
                      className={`text-[11px] rounded-full border px-2.5 py-1 transition-colors ${
                        on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {ctx.mode === "add_plugins" && (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Current plugins">
            {currentPluginNames.length === 0 ? (
              <p className="text-xs text-muted-foreground">No plugins on file.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {currentPluginNames.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[11px]">{p}</Badge>
                ))}
              </div>
            )}
          </SectionCard>
          <SectionCard title="Available plugins">
            {availablePlugins.length === 0 ? (
              <p className="text-xs text-muted-foreground">All plugins already licensed.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availablePlugins.map((p) => {
                  const on = pickedPlugins.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPickedPlugins(toggle(pickedPlugins, p))}
                      className={`text-[11px] rounded-full border px-2.5 py-1 transition-colors ${
                        on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {ctx.mode === "add_users" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SectionCard title="Current BackOffice users">
              <p className="text-2xl font-semibold text-foreground">{currentBoUsers}</p>
            </SectionCard>
            <SectionCard title="Current Web users">
              <p className="text-2xl font-semibold text-foreground">{currentWebUsers}</p>
            </SectionCard>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Additional BackOffice users</Label>
              <Input
                type="number" min={0}
                value={addBoUsers}
                onChange={(e) => setAddBoUsers(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Additional Web / Mobility users</Label>
              <Input
                type="number" min={0}
                value={addWebUsers}
                onChange={(e) => setAddWebUsers(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {ctx.mode === "renew_agreement" && (
        <div className="grid gap-3 md:grid-cols-2">
          <SectionCard title="Current license">
            <p className="text-sm font-semibold text-foreground">
              {currentLicenseLabel}
            </p>
          </SectionCard>
          <SectionCard title="Renewal date">
            <p className="text-sm font-semibold text-foreground">
              {currentRenewal ? new Date(currentRenewal).toLocaleDateString() : "—"}
            </p>
          </SectionCard>
          <SectionCard title="Current users">
            <p className="text-sm text-foreground">
              BackOffice: <span className="font-semibold">{currentBoUsers}</span>
              {" · "}
              Web: <span className="font-semibold">{currentWebUsers}</span>
            </p>
          </SectionCard>
          <SectionCard title="Active modules & plugins">
            <p className="text-sm text-foreground">
              {currentModuleNames.length} module(s) · {currentPluginNames.length} plugin(s)
            </p>
          </SectionCard>
        </div>
      )}

      <div className="flex justify-between pt-2 border-t">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>Skip wizard</Button>
        ) : <span />}
        <Button onClick={handleContinue}>
          Continue to Proposal Builder <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
