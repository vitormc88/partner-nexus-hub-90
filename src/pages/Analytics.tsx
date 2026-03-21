import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { usePartners } from "@/hooks/usePartners";
import { useClients } from "@/hooks/useClients";
import { useDeals } from "@/hooks/useDeals";
import { useRenewals } from "@/hooks/useDeals";
import { TrendingUp, TrendingDown, Target, DollarSign, Users, RefreshCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const COLORS = [
  "hsl(174, 62%, 34%)", "hsl(210, 80%, 52%)", "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 40%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(174, 62%, 48%)",
];

function KPI({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-4">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1 text-foreground">{value}</p>
      {sub && (
        <p className={`text-[11px] font-medium mt-1 ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
          {trend === "up" && "↑ "}{trend === "down" && "↓ "}{sub}
        </p>
      )}
    </div>
  );
}

export default function Analytics() {
  const [tab, setTab] = useState("overview");
  const { data: partners = [] } = usePartners();
  const { data: clients = [] } = useClients();
  const { data: deals = [] } = useDeals();
  const { data: renewals = [] } = useRenewals();

  const totalRevenue = partners.reduce((s, p) => s + (p.total_revenue || 0), 0);
  const totalPipeline = partners.reduce((s, p) => s + (p.pipeline_value || 0), 0);
  const activePartners = partners.filter(p => p.status === "Active").length;
  const activeClients = clients.filter(c => c.status === "Active").length;

  // Revenue by country
  const countryRevenue = new Map<string, number>();
  partners.forEach(p => { if (p.country) countryRevenue.set(p.country, (countryRevenue.get(p.country) || 0) + (p.total_revenue || 0)); });
  const revenueByCountryData = [...countryRevenue.entries()].map(([country, revenue]) => ({ country, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Partner performance
  const partnerPerf = partners.filter(p => (p.total_revenue || 0) > 0).map(p => ({
    partner: p.company_name.length > 18 ? p.company_name.slice(0, 18) + "…" : p.company_name,
    revenue: p.total_revenue || 0,
    clients: p.number_of_clients || 0,
    pipeline: p.pipeline_value || 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // Deals by stage
  const stageMap = new Map<string, { count: number; value: number }>();
  deals.forEach(d => {
    const e = stageMap.get(d.stage) || { count: 0, value: 0 };
    e.count++;
    e.value += d.expected_value || 0;
    stageMap.set(d.stage, e);
  });
  const stageData = [...stageMap.entries()].map(([stage, v]) => ({ stage, ...v }));

  // Renewals stats
  const wonRenewals = renewals.filter(r => r.status === "Won").length;
  const lostRenewals = renewals.filter(r => r.status === "Lost").length;
  const totalRenewals = renewals.length;
  const successRate = totalRenewals > 0 ? Math.round((wonRenewals / Math.max(wonRenewals + lostRenewals, 1)) * 100) : 0;
  const renewalValue = renewals.filter(r => r.status === "Won").reduce((s, r) => s + (r.final_value || r.estimated_value || 0), 0);

  // Salesperson performance
  const salesMap = new Map<string, { revenue: number; deals: number; won: number; total: number }>();
  deals.forEach(d => {
    const name = d.assigned_salesperson || "Unassigned";
    const e = salesMap.get(name) || { revenue: 0, deals: 0, won: 0, total: 0 };
    e.deals++;
    e.total++;
    if (d.status === "Won") { e.won++; e.revenue += d.total_value || 0; }
    salesMap.set(name, e);
  });
  const salesData = [...salesMap.entries()].map(([name, v]) => ({ name, ...v, conversion: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0 })).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-reveal-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue, performance & renewal insights</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="animate-reveal-up stagger-1">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Total Revenue" value={`€${(totalRevenue / 1000).toFixed(0)}k`} sub={`${partners.length} partners`} />
            <KPI label="Pipeline Value" value={`€${(totalPipeline / 1000).toFixed(0)}k`} sub={`${deals.filter(d => d.status === "Open").length} open deals`} />
            <KPI label="Active Partners" value={String(activePartners)} sub={`of ${partners.length} total`} />
            <KPI label="Active Clients" value={String(activeClients)} sub={`${clients.length} total`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border shadow-sm">
              <div className="p-5 border-b">
                <h3 className="font-semibold text-foreground">Revenue by Country</h3>
              </div>
              <div className="p-5">
                {revenueByCountryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={revenueByCountryData} layout="vertical" barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v / 1000}k`} />
                      <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`€${v.toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="hsl(174, 62%, 34%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-12">No revenue data yet</p>}
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm">
              <div className="p-5 border-b">
                <h3 className="font-semibold text-foreground">Pipeline by Stage</h3>
              </div>
              <div className="p-5">
                {stageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stageData} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v / 1000}k`} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`€${v.toLocaleString()}`, undefined]} />
                      <Bar dataKey="value" name="Value" fill="hsl(210, 80%, 52%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-12">No deals yet</p>}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="partners" className="space-y-6 mt-4">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b"><h3 className="font-semibold text-foreground">Partner Performance Ranking</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Partner</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Clients</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Pipeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {partnerPerf.map((p, i) => (
                    <tr key={p.partner} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{p.partner}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">€{p.revenue.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{p.clients}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">€{p.pipeline.toLocaleString()}</td>
                    </tr>
                  ))}
                  {partnerPerf.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No partner data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-5 border-b"><h3 className="font-semibold text-foreground">Revenue by Partner</h3></div>
            <div className="p-5">
              {partnerPerf.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={partnerPerf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="partner" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`€${v.toLocaleString()}`, undefined]} />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(174, 62%, 34%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-12">No data</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="renewals" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Success Rate" value={`${successRate}%`} sub={`${wonRenewals} of ${totalRenewals} renewed`} trend={successRate > 70 ? "up" : "down"} />
            <KPI label="Total Renewals" value={String(totalRenewals)} sub={`${renewals.filter(r => r.status === "Upcoming" || r.status === "Due Soon").length} upcoming`} />
            <KPI label="Renewal Revenue" value={`€${(renewalValue / 1000).toFixed(0)}k`} />
            <KPI label="Lost Renewals" value={String(lostRenewals)} trend={lostRenewals > 0 ? "down" : undefined} />
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-5 border-b"><h3 className="font-semibold text-foreground">Renewals by Status</h3></div>
            <div className="p-5">
              {(() => {
                const statusMap = new Map<string, number>();
                renewals.forEach(r => statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1));
                const data = [...statusMap.entries()].map(([status, count]) => ({ status, count }));
                return data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="count" name="Count" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-12">No renewal data</p>;
              })()}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6 mt-4">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b"><h3 className="font-semibold text-foreground">Sales Performance</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Salesperson</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Deals</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Won</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {salesData.map(s => (
                    <tr key={s.name} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{s.name}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">€{s.revenue.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{s.deals}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{s.won}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`tabular-nums font-medium ${s.conversion >= 50 ? "text-emerald-600" : "text-foreground"}`}>{s.conversion}%</span>
                      </td>
                    </tr>
                  ))}
                  {salesData.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No sales data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Open Deals" value={String(deals.filter(d => d.status === "Open").length)} />
            <KPI label="Pipeline Value" value={`€${(deals.filter(d => d.status === "Open").reduce((s, d) => s + (d.expected_value || 0), 0) / 1000).toFixed(0)}k`} />
            <KPI label="Won Deals" value={String(deals.filter(d => d.status === "Won").length)} trend="up" />
            <KPI label="Lost Deals" value={String(deals.filter(d => d.status === "Lost").length)} trend="down" />
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-5 border-b"><h3 className="font-semibold text-foreground">Pipeline by Stage</h3></div>
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
                    <Bar yAxisId="value" dataKey="value" name="Value (€)" fill="hsl(174, 62%, 34%)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="count" dataKey="count" name="Deals" fill="hsl(210, 80%, 52%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-12">No pipeline data</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
