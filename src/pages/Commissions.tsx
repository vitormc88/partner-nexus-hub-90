import { useState } from "react";
import { mockCommissions } from "@/data/deals-mock-data";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, CheckCircle2, Clock } from "lucide-react";

const statusVariant = { Pending: "warning" as const, Approved: "info" as const, Paid: "success" as const };

export default function Commissions() {
  const [filter, setFilter] = useState<"all" | "Pending" | "Approved" | "Paid">("all");
  const filtered = filter === "all" ? mockCommissions : mockCommissions.filter(c => c.paymentStatus === filter);

  const totalCommissions = mockCommissions.reduce((s, c) => s + c.commissionValue, 0);
  const totalRevenue = mockCommissions.reduce((s, c) => s + c.softwareRevenue, 0);
  const pending = mockCommissions.filter(c => c.paymentStatus === "Pending").reduce((s, c) => s + c.commissionValue, 0);
  const paid = mockCommissions.filter(c => c.paymentStatus === "Paid").reduce((s, c) => s + c.commissionValue, 0);

  // Group by partner
  const byPartner = new Map<string, { name: string; revenue: number; commission: number; count: number }>();
  mockCommissions.forEach(c => {
    const existing = byPartner.get(c.partnerId) || { name: c.partnerName, revenue: 0, commission: 0, count: 0 };
    existing.revenue += c.softwareRevenue;
    existing.commission += c.commissionValue;
    existing.count++;
    byPartner.set(c.partnerId, existing);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="animate-reveal-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Commissions</h1>
        <p className="text-sm text-muted-foreground mt-1">{mockCommissions.length} commission records</p>
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

      {/* By Partner */}
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
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 animate-reveal-up" style={{ animationDelay: "120ms" }}>
        {(["all", "Pending", "Approved", "Paid"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border text-muted-foreground hover:bg-secondary"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {/* Table */}
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
                <td className="px-5 py-3 font-medium text-foreground">{c.companyName}</td>
                <td className="px-5 py-3 text-muted-foreground">{c.partnerName}</td>
                <td className="px-5 py-3"><Badge variant="outline" className="text-xs">{c.commissionType}</Badge></td>
                <td className="px-5 py-3 text-right tabular-nums">€{c.softwareRevenue.toLocaleString()}</td>
                <td className="px-5 py-3 text-right tabular-nums">{c.partnerMarginPct}%</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold text-foreground">€{c.commissionValue.toLocaleString()}</td>
                <td className="px-5 py-3"><Badge variant={statusVariant[c.paymentStatus]}>{c.paymentStatus}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
