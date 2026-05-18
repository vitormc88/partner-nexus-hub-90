import { useParams, useNavigate } from "react-router-dom";
import { useIncomingLead, useUpdateIncomingLead, useDeleteIncomingLead } from "@/hooks/useIncomingLeads";
import { usePartners } from "@/hooks/usePartners";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Building2, Trash2, Save, ArrowRight, CheckCircle2, XCircle,
  Plus, Sparkles, Clock, Wallet, Users, Lightbulb, AlertCircle, ListChecks,
  HelpCircle, Target, Mail, Phone, Globe, Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { ConvertToOpportunityDialog } from "@/components/leads/ConvertToOpportunityDialog";
import { LeadTaskList } from "@/components/leads/LeadTaskList";
import { AddLeadTaskDialog } from "@/components/leads/AddLeadTaskDialog";
import { cn } from "@/lib/utils";
import {
  QUALIFICATION_STAGES, type QualificationStage,
  TIMD_CATEGORIES, CATEGORY_STATUSES, statusValue,
  timdCompletion, fitScore, missingInformation, nextBestActions,
  suggestedQuestions, contextualGuidance, FIT_FACTORS,
  CURRENT_PROCESS_OPTIONS, MAIN_CHALLENGE_OPTIONS, EXISTING_SYSTEM_OPTIONS, DATA_VISIBILITY_OPTIONS,
} from "@/lib/qualification";

const TIMD_ICONS = { Sparkles, Clock, Wallet, Users } as const;

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useIncomingLead(id);
  const { data: partners = [] } = usePartners();
  const updateLead = useUpdateIncomingLead();
  const deleteLead = useDeleteIncomingLead();
  const { isHQ, isAdmin } = useAuth();

  const isHQUser = isHQ || isAdmin;
  const activePartners = partners.filter((p) => p.is_active);

  // Editable buffer for the whole record (qualification + assignment + notes).
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    if (lead) {
      setDraft({ ...lead });
      setDirty(false);
    }
  }, [lead]);

  const set = (patch: Record<string, any>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const isConverted = !!draft?.converted_to_deal_id;
  const stage: QualificationStage = (draft.qualification_stage as QualificationStage) || "New";

  const timd = useMemo(() => timdCompletion(draft), [draft]);
  const fit = useMemo(() => fitScore(draft), [draft]);
  const missing = useMemo(() => missingInformation(draft), [draft]);
  const actions = useMemo(() => nextBestActions(draft), [draft]);
  const questions = useMemo(() => suggestedQuestions(draft), [draft]);
  const guidance = useMemo(() => contextualGuidance(draft), [draft]);

  const handleSave = (extra: Record<string, any> = {}) => {
    if (!lead) return;
    const partnerId = draft.linked_partner_id === "__hq__" ? null : draft.linked_partner_id;
    const ownerType = partnerId ? "partner" : "HQ";
    const base: any = {
      id: lead.id,
      status: draft.status,
      qualification_stage: draft.qualification_stage,
      notes: draft.notes,
      interest_status: draft.interest_status,
      interest_notes: draft.interest_notes,
      timing_status: draft.timing_status,
      timing_notes: draft.timing_notes,
      budget_status: draft.budget_status,
      budget_notes: draft.budget_notes,
      decision_status: draft.decision_status,
      decision_notes: draft.decision_notes,
      current_process: draft.current_process,
      main_challenge: draft.main_challenge,
      existing_system: draft.existing_system,
      data_visibility: draft.data_visibility,
      disqualified_reason: draft.disqualified_reason,
      ...Object.fromEntries(FIT_FACTORS.map((f) => [f.key, !!draft[f.key]])),
      ...extra,
    };
    if (isHQUser) {
      base.linked_partner_id = partnerId;
      base.lead_owner_type = ownerType;
      base.routing_reason = draft.routing_reason;
    }
    updateLead.mutate(base, {
      onSuccess: () => {
        toast.success("Lead updated");
        setDirty(false);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const markQualified = () =>
    handleSave({ qualification_stage: "Qualified", status: "Qualified" });
  const markDisqualified = () =>
    handleSave({ qualification_stage: "Disqualified", status: "Rejected" });

  const handleDelete = () => {
    if (!lead) return;
    deleteLead.mutate(lead.id, {
      onSuccess: () => {
        toast.success("Lead deleted");
        navigate("/incoming-leads");
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading lead…</div>;
  if (!lead) return <div className="p-6 text-muted-foreground">Lead not found.</div>;

  const canConvert = stage === "Qualified" && !isConverted && isHQUser;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/incoming-leads")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{draft.company_name || "Unnamed Lead"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {format(new Date(lead.created_at), "dd MMM yyyy 'at' HH:mm")}
              {draft.contact_name ? ` · ${draft.contact_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StageBadge stage={stage} />
          {draft.linked_partner_id && partners.find((p) => p.id === draft.linked_partner_id) ? (
            <Badge variant="secondary" className="gap-1">
              <Building2 className="h-3 w-3" />
              {partners.find((p) => p.id === draft.linked_partner_id)?.company_name}
            </Badge>
          ) : (
            <Badge variant="outline">HQ owned</Badge>
          )}
        </div>
      </div>

      {/* QUALIFICATION JOURNEY */}
      <QualificationJourney
        current={stage}
        onChange={(s) => set({ qualification_stage: s })}
        disabled={isConverted}
      />

      {/* TOP ACTIONS */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={markQualified} disabled={updateLead.isPending || isConverted || stage === "Qualified"}>
          <CheckCircle2 className="h-4 w-4" />
          Mark as Qualified
        </Button>
        <Button variant="outline" onClick={markDisqualified} disabled={updateLead.isPending || isConverted}>
          <XCircle className="h-4 w-4" />
          Disqualify
        </Button>
        <Button variant="outline" onClick={() => setShowAddTask(true)}>
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
        <Button
          variant={canConvert ? "default" : "outline"}
          onClick={() => setShowConvert(true)}
          disabled={!isHQUser || isConverted}
          className={cn(!canConvert && "opacity-80")}
        >
          <ArrowRight className="h-4 w-4" />
          Convert to Opportunity
        </Button>
        <div className="flex-1" />
        <Button variant="default" onClick={() => handleSave()} disabled={!dirty || updateLead.isPending}>
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* MAIN */}
        <div className="space-y-6 min-w-0">
          {/* OVERVIEW CARD */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lead Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <Info icon={Building2} label="Company" value={draft.company_name} />
                <Info icon={Users} label="Contact" value={draft.contact_name} />
                <Info icon={Briefcase} label="Job role" value={draft.job_role} />
                <Info icon={Mail} label="Email" value={draft.email} />
                <Info icon={Phone} label="Phone" value={draft.phone} />
                <Info icon={Globe} label="Country" value={draft.country} />
                <Info icon={Target} label="Source" value={draft.lead_source} />
                <Info label="Asset range" value={draft.asset_range} />
                <Info label="Maintenance team" value={draft.maintenance_team_size} />
                <Info label="Sector" value={draft.sector} />
                <Info label="SharpSpring ID" value={draft.sharpspring_id} />
              </div>
            </CardContent>
          </Card>

          {/* TABS */}
          <Tabs defaultValue="qualification" className="w-full">
            <TabsList>
              <TabsTrigger value="qualification">Qualification</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
            </TabsList>

            {/* QUALIFICATION TAB */}
            <TabsContent value="qualification" className="space-y-6 mt-4">
              {/* FIT SCORE */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Lead Fit</CardTitle>
                  <FitBadge label={fit.label} tone={fit.tone} score={fit.score} total={fit.total} />
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {FIT_FACTORS.map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm cursor-pointer hover:bg-accent/40 transition"
                    >
                      <Checkbox
                        checked={!!draft[f.key]}
                        onCheckedChange={(v) => set({ [f.key]: !!v })}
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>

              {/* TIMD-LITE */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Qualification Checklist</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Interest · Timing · Budget · Decision making</p>
                  </div>
                  <div className="w-40">
                    <div className="text-xs text-muted-foreground mb-1 text-right">{timd.percent}% complete</div>
                    <Progress value={timd.percent} className="h-2" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {TIMD_CATEGORIES.map((c) => {
                    const Icon = TIMD_ICONS[c.icon as keyof typeof TIMD_ICONS];
                    const status = statusValue(draft[`${c.key}_status`]);
                    return (
                      <div key={c.key} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 font-medium text-sm">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {c.label}
                          </div>
                          <div className="flex items-center gap-1">
                            {CATEGORY_STATUSES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => set({ [`${c.key}_status`]: s })}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-xs border transition",
                                  status === s
                                    ? statusPill(s)
                                    : "border-transparent bg-muted text-muted-foreground hover:bg-muted/70",
                                )}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <Textarea
                          value={draft[`${c.key}_notes`] || ""}
                          onChange={(e) => set({ [`${c.key}_notes`]: e.target.value })}
                          placeholder={`Notes on ${c.label.toLowerCase()}…`}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* CURRENT SITUATION SNAPSHOT */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Current Situation</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PickerField
                    label="Current process"
                    value={draft.current_process}
                    options={CURRENT_PROCESS_OPTIONS}
                    onChange={(v) => set({ current_process: v })}
                  />
                  <PickerField
                    label="Main challenge"
                    value={draft.main_challenge}
                    options={MAIN_CHALLENGE_OPTIONS}
                    onChange={(v) => set({ main_challenge: v })}
                  />
                  <PickerField
                    label="Existing system"
                    value={draft.existing_system}
                    options={EXISTING_SYSTEM_OPTIONS}
                    onChange={(v) => set({ existing_system: v })}
                  />
                  <PickerField
                    label="Data visibility"
                    value={draft.data_visibility}
                    options={DATA_VISIBILITY_OPTIONS}
                    onChange={(v) => set({ data_visibility: v })}
                  />
                </CardContent>
              </Card>

              {stage === "Disqualified" && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-destructive">Disqualification reason</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={draft.disqualified_reason || ""}
                      onChange={(e) => set({ disqualified_reason: e.target.value })}
                      placeholder="Why was this lead disqualified?"
                      rows={3}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* NOTES TAB */}
            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Internal notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={draft.notes || ""}
                    onChange={(e) => set({ notes: e.target.value })}
                    rows={10}
                    placeholder="Add internal notes about this lead…"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TASKS */}
            <TabsContent value="tasks" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <LeadTaskList
                    leadId={lead.id}
                    leadCompanyName={lead.company_name || "Unnamed Lead"}
                    linkedPartnerId={lead.linked_partner_id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ASSIGNMENT */}
            <TabsContent value="assignment" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Assigned partner</Label>
                    {isHQUser ? (
                      <Select
                        value={draft.linked_partner_id || "__hq__"}
                        onValueChange={(v) => set({ linked_partner_id: v === "__hq__" ? null : v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__hq__">No partner (HQ owned)</SelectItem>
                          {activePartners
                            .sort((a, b) => a.company_name.localeCompare(b.company_name))
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.company_name} {p.country ? `(${p.country})` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="mt-1 font-medium">
                        {partners.find((p) => p.id === draft.linked_partner_id)?.company_name || "HQ"}
                      </p>
                    )}
                  </div>
                  {isHQUser && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Routing reason</Label>
                      <Input
                        className="mt-1"
                        value={draft.routing_reason || ""}
                        onChange={(e) => set({ routing_reason: e.target.value })}
                        placeholder="Why was this lead routed this way?"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {isAdmin && (
                <Card className="border-destructive/30">
                  <CardContent className="pt-6 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Permanently delete this lead record.</p>
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteLead.isPending}>
                      <Trash2 className="h-4 w-4" /> Delete lead
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {isConverted && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Converted to pipeline opportunity</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/deals/${draft.converted_to_deal_id}`)}>
                  <ArrowRight className="h-4 w-4" /> View opportunity
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT SIDEBAR – QUALIFICATION ASSISTANT */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Qualification Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Next best action */}
              <AsstSection icon={Target} title="Next best action">
                <ul className="space-y-1.5 text-sm">
                  {actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setShowAddTask(true)}>
                  <Plus className="h-3.5 w-3.5" /> Create task
                </Button>
              </AsstSection>

              {/* Missing information */}
              <AsstSection
                icon={AlertCircle}
                title="Missing information"
                badge={missing.length ? String(missing.length) : undefined}
              >
                {missing.length === 0 ? (
                  <p className="text-xs text-muted-foreground">All key information captured.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {missing.map((m, i) => (
                      <li key={i} className="text-muted-foreground">• {m}</li>
                    ))}
                  </ul>
                )}
              </AsstSection>

              {/* Suggested questions */}
              <AsstSection icon={HelpCircle} title="Suggested questions">
                <ul className="space-y-1.5 text-sm">
                  {questions.map((q, i) => (
                    <li key={i} className="text-muted-foreground leading-snug">“{q}”</li>
                  ))}
                </ul>
              </AsstSection>

              {/* Contextual guidance */}
              {guidance && (
                <AsstSection icon={Lightbulb} title={guidance.title}>
                  <ul className="space-y-1 text-sm">
                    {guidance.items.map((g, i) => (
                      <li key={i} className="text-muted-foreground">• {g}</li>
                    ))}
                  </ul>
                </AsstSection>
              )}

              {/* Conversion guidance */}
              <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <ListChecks className="h-3.5 w-3.5" />
                  Ready to convert?
                </div>
                {missing.length > 0 ? (
                  <p className="text-muted-foreground">
                    Qualification incomplete — {missing.length} item{missing.length > 1 ? "s" : ""} still missing.
                    Conversion is allowed but not recommended yet.
                  </p>
                ) : (
                  <p className="text-muted-foreground">Looks good. You can convert this lead to an opportunity.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Dialogs */}
      {lead && (
        <ConvertToOpportunityDialog open={showConvert} onOpenChange={setShowConvert} lead={lead} />
      )}
      <AddLeadTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        leadId={lead.id}
        leadCompanyName={lead.company_name || "Unnamed Lead"}
        linkedPartnerId={lead.linked_partner_id}
      />
    </div>
  );
}

/* ---------- helpers ---------- */

function Info({ icon: Icon, label, value }: { icon?: any; label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </div>
      <div className="mt-0.5 font-medium truncate">{value || "—"}</div>
    </div>
  );
}

function PickerField({
  label, value, options, onChange,
}: { label: string; value: any; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder={`Select ${label.toLowerCase()}…`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function QualificationJourney({
  current, onChange, disabled,
}: { current: QualificationStage; onChange: (s: QualificationStage) => void; disabled?: boolean }) {
  // Show only the journey stages (exclude Disqualified — it's an off-path terminal).
  const stages = QUALIFICATION_STAGES.filter((s) => s !== "Disqualified");
  const currentIdx = stages.indexOf(current as any);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {stages.map((s, i) => {
          const isActive = i === currentIdx;
          const isDone = currentIdx > -1 && i < currentIdx;
          return (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                  isActive && "bg-primary text-primary-foreground border-primary",
                  isDone && !isActive && "bg-success/10 text-success border-success/30",
                  !isActive && !isDone && "bg-muted text-muted-foreground border-transparent hover:bg-muted/70",
                  disabled && "opacity-60 cursor-not-allowed",
                )}
              >
                {s}
              </button>
              {i < stages.length - 1 && <span className="h-px w-6 bg-border" />}
            </div>
          );
        })}
        {current === "Disqualified" && (
          <Badge variant="destructive" className="ml-2">Disqualified</Badge>
        )}
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: QualificationStage }) {
  const map: Record<QualificationStage, string> = {
    New: "bg-info/10 text-info border-info/20",
    Qualification: "bg-warning/15 text-warning-foreground border-warning/20",
    "Discovery Call": "bg-purple-100 text-purple-800 border-purple-200",
    Qualified: "bg-success/10 text-success border-success/20",
    Converted: "bg-primary/10 text-primary border-primary/20",
    Disqualified: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return <Badge className={cn("border", map[stage])}>{stage}</Badge>;
}

function FitBadge({ label, tone, score, total }: {
  label: string; tone: "success" | "warning" | "destructive"; score: number; total: number;
}) {
  const cls = {
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
  }[tone];
  return (
    <div className={cn("px-3 py-1 rounded-full text-xs font-medium border", cls)}>
      {label} · {score}/{total}
    </div>
  );
}

function statusPill(s: string) {
  if (s === "complete") return "bg-success/15 text-success border-success/30";
  if (s === "partial") return "bg-warning/20 text-warning-foreground border-warning/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

function AsstSection({
  icon: Icon, title, badge, children,
}: { icon: any; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </div>
        {badge && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
      </div>
      {children}
    </div>
  );
}
