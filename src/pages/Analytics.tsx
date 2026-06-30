import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, AlertTriangle, Activity, Globe2, Sparkles } from "lucide-react";
import { PIPELINE_STAGES } from "@/data/pipeline-stages";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePipelineStageBreakdown,
  useSalesPerformance,
  usePartnerAnalytics,
  useRenewalsAnalytics,
  useRevenueByCountry,
  useOutcomes,
  useDealReconciliation,
  lastUpdatedLabel,
} from "@/hooks/useAnalytics";

function KPI({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1 text-foreground tracking-tight">{value}</p>
      {sub && (
        <p className={`text-[11px] font-medium mt-1 ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
          {trend === "up" && "↑ "}{trend === "down" && "↓ "}{sub}
        </p>
      )}
    </div>
  );
}

function EmptyState({ message = "No analytics data available yet", hint }: { message?: string; hint?: string }) {
  return (
    <div className="text-center py-8 px-4">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function ExecCard({
  title, icon: Icon, onClick, children,
}: { title: string; icon: any; onClick?: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      className={`group text-left bg-card rounded-xl border shadow-sm transition-all flex flex-col ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/40" : ""}`}
    >
      <div className="px-4 py-2.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-accent flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {onClick && <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="p-4 flex-1 min-h-0">{children}</div>
    </div>
  );
}

const fmtEuro = (v: number) => `€${v.toLocaleString()}`;
const fmtEuroK = (v: number) => `€${(v / 1000).toFixed(0)}k`;

export default function Analytics() {
  const [tab, setTab] = useState("overview");
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const pipelineStage = usePipelineStageBreakdown();
  const sales = useSalesPerformance();
  const partners = usePartnerAnalytics();
  const renewals = useRenewalsAnalytics();
  const country = useRevenueByCountry();
  const outcomes = useOutcomes();
  const reconciliation = useDealReconciliation(isAdmin);

  // Order pipeline-stage data by canonical stage order
  const stageOrder = new Map<string, number>(
    PIPELINE_STAGES.filter(s => s.key !== "Won" && s.key !== "Lost").map((s, i) => [s.key as string, i])
  );
  const stageData = (pipelineStage.data || []).slice().sort((a, b) => (stageOrder.get(a.stage) ?? 99) - (stageOrder.get(b.stage) ?? 99));

  // Derived overview totals from views
  const wonOutcomes = (outcomes.data || []).filter(o => o.status === "Won");
  const lostOutcomes = (outcomes.data || []).filter(o => o.status === "Lost");
  const totalRevenue = wonOutcomes.reduce((s, o) => s + o.value, 0);
  const totalPipelineValue = stageData.reduce((s, r) => s + r.total_value, 0);
  const totalWeightedPipeline = stageData.reduce((s, r) => s + r.weighted_value, 0);
  const totalOpenDeals = stageData.reduce((s, r) => s + r.deal_count, 0);
  const conversionRate = wonOutcomes.length + lostOutcomes.length > 0
    ? Math.round((wonOutcomes.length / (wonOutcomes.length + lostOutcomes.length)) * 100)
    : 0;

  const lastUpdated = Math.max(
    pipelineStage.dataUpdatedAt || 0,
    sales.dataUpdatedAt || 0,
    partners.dataUpdatedAt || 0,
    renewals.dataUpdatedAt || 0,
    country.dataUpdatedAt || 0,
    outcomes.dataUpdatedAt || 0,
  );

  // --- Executive derivations (presentation-only, no business logic changes) ---
  const topCountry = (country.data || [])[0];
  const topCountryPct = topCountry && totalRevenue > 0 ? Math.round((topCountry.revenue / totalRevenue) * 100) : 0;

  const largestStage = useMemo(() => stageData.slice().sort((a, b) => b.total_value - a.total_value)[0], [stageData]);
  const mostOppStage = useMemo(() => stageData.slice().sort((a, b) => b.deal_count - a.deal_count)[0], [stageData]);
  // Bottleneck = stage holding the largest commercial exposure (value)
  const bottleneckStage = largestStage;

  const topPartner = (partners.data || [])[0];
  const overdueRenewals = renewals.data?.overdue ?? 0;

  const alerts = useMemo(() => {
    const out: Array<{ tone: "red" | "orange" | "yellow" | "green"; text: string; onClick?: () => void }> = [];
    if (overdueRenewals > 0) {
      out.push({ tone: "red", text: `${overdueRenewals} renewal${overdueRenewals !== 1 ? "s" : ""} overdue`, onClick: () => navigate("/renewals") });
    }
    if (bottleneckStage && bottleneckStage.total_value > 0) {
      out.push({ tone: "orange", text: `${bottleneckStage.stage} concentrates ${fmtEuroK(bottleneckStage.total_value)} of exposure`, onClick: () => navigate("/pipeline") });
    }
    (partners.data || []).forEach(p => {
      if (p.pipeline > 0 && p.client_count === 0) {
        out.push({ tone: "yellow", text: `${p.company_name} has pipeline but no active clients`, onClick: () => navigate(`/partners/${p.partner_id}`) });
      }
    });
    if (topPartner && topPartner.won_deal_count >= 3) {
      out.push({ tone: "green", text: `${topPartner.company_name} closed ${topPartner.won_deal_count} deals (${fmtEuroK(topPartner.revenue)})`, onClick: () => navigate(`/partners/${topPartner.partner_id}`) });
    }
    return out.slice(0, 5);
  }, [overdueRenewals, bottleneckStage, partners.data, topPartner, navigate]);

  const highlights = useMemo(() => {
    const out: string[] = [];
    if (topCountry) out.push(`Revenue is led by ${topCountry.country} (${topCountryPct}% of total).`);
    if (largestStage) out.push(`Pipeline value is concentrated in ${largestStage.stage}.`);
    if (mostOppStage && mostOppStage.stage !== largestStage?.stage) out.push(`${mostOppStage.stage} holds the most opportunities (${mostOppStage.deal_count}).`);
    if (conversionRate > 0) out.push(`Conversion rate sits at ${conversionRate}% across closed deals.`);
    if (overdueRenewals > 0) out.push(`Renewals are the primary commercial risk (${overdueRenewals} overdue).`);
    else if ((renewals.data?.upcoming ?? 0) > 0) out.push(`${renewals.data?.upcoming} renewals upcoming — protect recurring revenue.`);
    if (topPartner) out.push(`${topPartner.company_name} remains the strongest performing partner.`);
    return out.slice(0, 5);
  }, [topCountry, topCountryPct, largestStage, mostOppStage, conversionRate, overdueRenewals, renewals.data, topPartner]);

  const toneStyles: Record<string, string> = {
    red: "bg-destructive/10 text-destructive border-destructive/30",
    orange: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300",
    green: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-reveal-up gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Executive cockpit · live commercial intelligence</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live database
          </span>
          <span className="text-[11px] text-muted-foreground">{lastUpdatedLabel(lastUpdated)}</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="animate-reveal-up stagger-1">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
        </TabsList>

        {/* ---------- OVERVIEW (Executive Cockpit) ---------- */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Total Revenue (Won)" value={fmtEuroK(totalRevenue)} sub={`${wonOutcomes.length} won deal${wonOutcomes.length !== 1 ? "s" : ""}`} />
            <KPI label="Pipeline Value (Open)" value={fmtEuroK(totalPipelineValue)} sub={`${totalOpenDeals} open deal${totalOpenDeals !== 1 ? "s" : ""}`} />
            <KPI label="Weighted Pipeline" value={fmtEuroK(totalWeightedPipeline)} sub="Probability-adjusted" />
            <KPI label="Conversion Rate" value={`${conversionRate}%`} sub={`${wonOutcomes.length} won / ${lostOutcomes.length} lost`} trend={conversionRate >= 50 ? "up" : conversionRate > 0 ? "down" : "neutral"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1 — Revenue by Country */}
            <ExecCard title="Revenue by Country" icon={Globe2} onClick={() => setTab("partners")}>
              {(country.data || []).length > 0 ? (
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-2 space-y-1">
                    <p className="text-xs text-muted-foreground">Top country</p>
                    <p className="text-lg font-bold text-foreground">{topCountry?.country}</p>
                    <p className="text-sm font-semibold text-primary tabular-nums">{fmtEuroK(topCountry?.revenue || 0)}</p>
                    <p className="text-[11px] text-muted-foreground">{topCountryPct}% of total · {topCountry?.won_deal_count} won deal{(topCountry?.won_deal_count || 0) !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="col-span-3">
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={(country.data || []).slice(0, 5)} layout="vertical" barSize={10} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide tickFormatter={v => `€${v / 1000}k`} />
                        <YAxis type="category" dataKey="country" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [fmtEuro(v), "Revenue"]} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : <EmptyState hint="Win your first deal to populate this card." />}
            </ExecCard>

            {/* Card 2 — Pipeline Health */}
            <ExecCard title="Pipeline Health" icon={Activity} onClick={() => setTab("pipeline")}>
              {stageData.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Largest stage</p>
                    <p className="font-semibold text-foreground mt-0.5">{largestStage?.stage}</p>
                    <p className="text-xs text-primary tabular-nums">{fmtEuroK(largestStage?.total_value || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Most opportunities</p>
                    <p className="font-semibold text-foreground mt-0.5">{mostOppStage?.stage}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{mostOppStage?.deal_count} deals</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Weighted pipeline</p>
                    <p className="font-semibold text-foreground mt-0.5 tabular-nums">{fmtEuroK(totalWeightedPipeline)}</p>
                    <p className="text-xs text-muted-foreground">Probability-adjusted</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Attention</p>
                    <p className="text-xs text-foreground mt-0.5 leading-snug">{bottleneckStage?.stage} holds the highest commercial exposure.</p>
                  </div>
                </div>
              ) : <EmptyState hint="Create open opportunities to see pipeline health." />}
            </ExecCard>

            {/* Card 3 — Commercial Alerts */}
            <ExecCard title="Commercial Alerts" icon={AlertTriangle}>
              {alerts.length > 0 ? (
                <ul className="space-y-1.5">
                  {alerts.map((a, i) => (
                    <li
                      key={i}
                      onClick={(e) => { e.stopPropagation(); a.onClick?.(); }}
                      className={`flex items-start gap-2 text-xs px-2.5 py-2 rounded-md border ${toneStyles[a.tone]} ${a.onClick ? "cursor-pointer hover:opacity-80" : ""}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 bg-current" />
                      <span className="leading-snug">{a.text}</span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState message="All clear" hint="No commercial alerts at this time." />}
            </ExecCard>

            {/* Card 4 — Executive Highlights */}
            <ExecCard title="Executive Highlights" icon={Sparkles}>
              {highlights.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-foreground leading-snug">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState hint="Highlights will appear as data accumulates." />}
            </ExecCard>
          </div>
        </TabsContent>



        {/* ---------- PIPELINE ---------- */}
        <TabsContent value="pipeline" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Open Deals" value={String(totalOpenDeals)} />
            <KPI label="Pipeline Value" value={fmtEuroK(totalPipelineValue)} />
            <KPI label="Weighted Pipeline" value={fmtEuroK(totalWeightedPipeline)} sub="Probability-adjusted" />
            <KPI label="Avg Deal Size" value={totalOpenDeals > 0 ? fmtEuroK(totalPipelineValue / totalOpenDeals) : "—"} />
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-foreground">Pipeline by Stage</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Active stages only · Won and Lost shown separately as outcomes</p>
            </div>
            <div className="p-5">
              {stageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="value" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v / 1000}k`} />
                    <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar yAxisId="value" dataKey="total_value" name="Value (€)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="count" dataKey="deal_count" name="Deals" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState hint="Create open opportunities to see pipeline analytics." />}
            </div>
          </div>

          {/* Outcomes shown separately, not mixed with active pipeline */}
          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-foreground">Outcomes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Closed deals — separate from active pipeline</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KPI label="Won" value={String(wonOutcomes.length)} sub={fmtEuroK(totalRevenue)} trend={wonOutcomes.length > 0 ? "up" : "neutral"} />
              <KPI label="Lost" value={String(lostOutcomes.length)} sub={fmtEuroK(lostOutcomes.reduce((s, o) => s + o.value, 0))} trend={lostOutcomes.length > 0 ? "down" : "neutral"} />
              <KPI label="Conversion Rate" value={`${conversionRate}%`} sub="won / (won + lost)" />
            </div>
          </div>
        </TabsContent>

        {/* ---------- SALES ---------- */}
        <TabsContent value="sales" className="space-y-6 mt-4">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-foreground">Sales Performance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">By assigned user · revenue from won deals only</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Salesperson</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Revenue (Won)</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Open</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Won</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Lost</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Conversion</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Weighted Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(sales.data || []).map(s => (
                    <tr key={s.sales_key} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{s.sales_name}</span>
                          {isAdmin && s.is_unlinked && <Badge variant="outline" className="text-[10px] opacity-60" title="No linked user profile (HQ-only diagnostic)">Unlinked</Badge>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">{fmtEuro(s.won_revenue)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{s.open_count}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{s.won_count}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{s.lost_count}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`tabular-nums font-medium ${s.conversion >= 50 ? "text-emerald-600" : "text-foreground"}`}>{s.conversion}%</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{fmtEuro(s.weighted_pipeline)}</td>
                    </tr>
                  ))}
                  {(sales.data || []).length === 0 && (
                    <tr><td colSpan={7} className="p-0"><EmptyState hint="Assign opportunities to users to see performance breakdown." /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ---------- PARTNERS ---------- */}
        <TabsContent value="partners" className="space-y-6 mt-4">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b"><h3 className="font-semibold text-foreground">Partner Performance Ranking</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Partner</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Country</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Revenue (Won)</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Open Deals</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Pipeline</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Active Clients</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(partners.data || []).map((p, i) => (
                    <tr key={p.partner_id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{p.company_name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.country || "—"}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">{fmtEuro(p.revenue)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{p.open_deal_count}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{fmtEuro(p.pipeline)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{p.client_count}</td>
                    </tr>
                  ))}
                  {(partners.data || []).length === 0 && (
                    <tr><td colSpan={7} className="p-0"><EmptyState /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ---------- RENEWALS ---------- */}
        <TabsContent value="renewals" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Success Rate" value={`${renewals.data?.success_rate ?? 0}%`} sub={`${renewals.data?.won ?? 0} of ${(renewals.data?.won ?? 0) + (renewals.data?.lost ?? 0)} closed`} trend={(renewals.data?.success_rate ?? 0) >= 70 ? "up" : "down"} />
            <KPI label="Renewal Revenue" value={fmtEuroK(renewals.data?.won_value ?? 0)} sub={`${renewals.data?.won ?? 0} won`} />
            <KPI label="Upcoming" value={String(renewals.data?.upcoming ?? 0)} sub="Active, not yet due" />
            <KPI label="Overdue" value={String(renewals.data?.overdue ?? 0)} trend={(renewals.data?.overdue ?? 0) > 0 ? "down" : undefined} />
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-5 border-b"><h3 className="font-semibold text-foreground">Renewal Outcomes</h3></div>
            <div className="p-5">
              {(renewals.data?.total ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      { status: "Won", count: renewals.data?.won ?? 0 },
                      { status: "Lost", count: renewals.data?.lost ?? 0 },
                      { status: "Upcoming", count: renewals.data?.upcoming ?? 0 },
                      { status: "Overdue", count: renewals.data?.overdue ?? 0 },
                    ]}
                    barSize={28}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="count" name="Count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState hint="Renewal data will appear once renewals are tracked." />}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Admin-only reconciliation panel — helps audit Analytics numbers against raw deals */}
      {isAdmin && (
        <details className="bg-card rounded-xl border shadow-sm">
          <summary className="cursor-pointer p-4 text-sm font-semibold text-foreground flex items-center justify-between">
            <span>Data Reconciliation <span className="text-xs font-normal text-muted-foreground ml-2">HQ Admin only · 50 most recent deals</span></span>
            <Badge variant="outline" className="text-[10px]">Diagnostic</Badge>
          </summary>
          <div className="overflow-x-auto border-t">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50">
                <tr className="border-b">
                  {["Company","Status","Stage","Country (raw → normalized)","Salesperson","Value (auth)","Probability","Weighted","In Revenue","In Pipeline","Closed at"].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {(reconciliation.data || []).map((r: any) => {
                  const resolved = r.resolved_probability ?? 0;
                  const overridden = r.deal_probability != null && Number(r.deal_probability) > 0;
                  return (
                    <tr key={r.id} className="hover:bg-secondary/30">
                      <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{r.company_name}</td>
                      <td className="px-3 py-2"><Badge variant={r.status === "Won" ? "success" : r.status === "Lost" ? "destructive" : "outline"} className="text-[10px]">{r.status}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">{r.stage}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {r.country_raw || "—"} {r.country_raw !== r.country_normalized && <span className="text-foreground">→ {r.country_normalized || "—"}</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.salesperson}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtEuro(r.authoritative_value)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {resolved}%
                        <span className="ml-1 text-[10px] text-muted-foreground">{overridden ? "(custom)" : "(stage)"}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtEuro(r.weighted_value)}</td>
                      <td className="px-3 py-2 text-center">{r.in_revenue ? "✓" : "—"}</td>
                      <td className="px-3 py-2 text-center">{r.in_pipeline ? "✓" : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.status_changed_at ? new Date(r.status_changed_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
                {(reconciliation.data || []).length === 0 && (
                  <tr><td colSpan={11} className="p-0"><EmptyState message="No deals to reconcile" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
