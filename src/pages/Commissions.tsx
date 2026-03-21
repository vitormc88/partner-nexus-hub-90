import { useState } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { usePartners } from "@/hooks/usePartners";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, CheckCircle2, Clock } from "lucide-react";

const statusVariant = { Pending: "warning" as const, Approved: "info" as const, Paid: "success" as const };

export default function Commissions() {
  const [filter, setFilter] = useState<"all" | "Pending" | "Approved" | "Paid">("all");
  const { data: commissions = [], isLoading } = useCommissions();
  const { data: partners = [] } = usePartners();

  const partnerMap = new Map(partners.map(p => [p.id, p.company_name]));
  const filtered = filter === "all" ? commissions : commissions.filter(c => c.payment_status === filter);

  const totalCommissions = commissions.reduce((s, c) => s + (c.commission_value || 0), 0);
  const totalRevenue = commissions.reduce((s, c) => s + (c.software_revenue || 0), 0);
  const pending = commissions.filter(c => c.payment_status === "Pending").reduce((s, c) => s + (c.commission_value || 0), 0);
  const paid = commissions.filter(c => c.payment_status === "Paid").reduce((s, c) => s + (c.commission_value || 0), 0);

  const byPartner = new Map<string, { name: string; revenue: number; commission: number; count: number }>();
  commissions.forEach(c => {
    const key = c.partner_id;
    const existing = byPartner.get(key) || { name: partnerMap.get(key) || key, revenue: 0, commission: 0, count: 0 };
    existing.revenue += c.software_revenue || 0;
    existing.commission += c.commission_value || 0;
    existing.count++;
    byPartner.set(key, existing);
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="animate-reveal-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-1">{commissions.length} commission records</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-reveal-up" style={{ animationDelay: "60ms" }}>
        {[
          { label: "Total Revenue", value: `€${(totalRevenue / 1000).toFixed(0)}k`, icon: TrendingUp, accent: "text-foreground" },
          { label: "Total Commissions", value: `€${(totalCommissions / 1000).toFixed(0)}k`, icon: DollarSign, accent: "text-primary" },
          { label: "Pending Payout", value: `€${(pending / 1000).toFixed(0)}k`, icon: Clock, accent: "text-amber-600" },
          { label: "Paid", value: `€${(paid / 1000).toFixed(0)}k`, icon: CheckCircle2, accent: "text-emerald-600" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card rounded-xl border shadow-sm p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
            </div>
            <div>
              <p className={`text-lg font-bold tabular-nums ${kpi.accent}`}>{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-5 animate-reveal-up" style={{ animationDelay: "90ms" }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">By Partner</h3>
        <div className="space-y-2">
          {[...byPartner.entries()].map(([id, p]) => (
            <div key={id} className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{p.count} deal{p.count > 1 ? "s" : ""} · €{p.revenue.toLocaleString()} revenue</p>
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums">€{p.commission.toLocaleString()}</span>
            </div>
          ))}
          {byPartner.size === 0 && <p className="text-sm text-muted-foreground text-center py-4">No commission data yet</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 animate-reveal-up" style={{ animationDelay: "120ms" }}>
        {(["all", "Pending", "Approved", "Paid"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border text-muted-foreground hover:bg-secondary"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden animate-reveal-up" style={{ animationDelay: "150ms" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Deal</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Partner</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Type</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Software Rev.</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Margin</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Commission</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground">{(c.deals as any)?.company_name || "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{partnerMap.get(c.partner_id) || c.partner_id}</td>
                <td className="px-5 py-3"><Badge variant="outline" className="text-xs">{c.commission_type}</Badge></td>
                <td className="px-5 py-3 text-right tabular-nums">€{(c.software_revenue || 0).toLocaleString()}</td>
                <td className="px-5 py-3 text-right tabular-nums">{c.partner_margin_pct}%</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">€{(c.commission_value || 0).toLocaleString()}</td>
                <td className="px-5 py-3"><Badge variant={statusVariant[c.payment_status as keyof typeof statusVariant] || "outline"}>{c.payment_status}</Badge></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">No commissions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
