import { useState } from "react";
import { Link } from "react-router-dom";
import { mockDeals, pipelineStages, getPipelineStats, DealStage } from "@/data/deals-mock-data";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Calendar, GripVertical, Search, Filter, TrendingUp, Target, AlertTriangle, Trophy } from "lucide-react";

const stageOrder: DealStage[] = ["Lead", "Meeting", "Demo", "Follow-up", "Negotiation", "Won", "Lost"];

export default function Pipeline() {
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [deals, setDeals] = useState(mockDeals);
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);

  const partners = [...new Set(mockDeals.map(d => d.partnerName))];
  const filtered = deals.filter(d => {
    const matchSearch = d.companyName.toLowerCase().includes(search.toLowerCase()) || d.assignedSalesperson.toLowerCase().includes(search.toLowerCase());
    const matchPartner = partnerFilter === "all" || d.partnerName === partnerFilter;
    return matchSearch && matchPartner;
  });

  const stats = getPipelineStats(filtered);

  const handleDragStart = (dealId: string) => setDraggedDeal(dealId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (stage: DealStage) => {
    if (!draggedDeal) return;
    setDeals(prev => prev.map(d => d.id === draggedDeal ? { ...d, stage, status: stage === "Won" ? "Won" as const : stage === "Lost" ? "Lost" as const : "Open" as const, stageEnteredAt: new Date().toISOString() } : d));
    setDraggedDeal(null);
  };

  const activityIcon = (type: string) => {
    if (type === "call") return <Phone className="h-3 w-3" />;
    if (type === "email") return <Mail className="h-3 w-3" />;
    return <Calendar className="h-3 w-3" />;
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <div className="flex items-center justify-between animate-reveal-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">{stats.open} open deals · €{(stats.totalPipeline / 1000).toFixed(0)}k pipeline</p>
        </div>
        <Link to="/deals/new" className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-[0.97] inline-flex items-center">
          + New Deal
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-reveal-up" style={{ animationDelay: "60ms" }}>
        {[
          { label: "Pipeline Value", value: `€${(stats.totalPipeline / 1000).toFixed(0)}k`, icon: TrendingUp, accent: "text-primary" },
          { label: "Weighted Pipeline", value: `€${(stats.weightedPipeline / 1000).toFixed(0)}k`, icon: Target, accent: "text-foreground" },
          { label: "Win Rate", value: `${stats.winRate}%`, icon: Trophy, accent: "text-emerald-600" },
          { label: "Stuck Deals", value: String(stats.stuckDeals), icon: AlertTriangle, accent: stats.stuckDeals > 0 ? "text-amber-600" : "text-foreground" },
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

      {/* Filters */}
      <div className="flex items-center gap-3 animate-reveal-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search deals..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
        </div>
        <select value={partnerFilter} onChange={e => setPartnerFilter(e.target.value)} className="h-9 px-3 rounded-lg border bg-card text-sm text-muted-foreground">
          <option value="all">All Partners</option>
          {partners.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 animate-reveal-up" style={{ animationDelay: "180ms" }}>
        {pipelineStages.filter(s => s.key !== "Won" && s.key !== "Lost").map(stage => {
          const stageDeals = filtered.filter(d => d.stage === stage.key);
          const stageValue = stageDeals.reduce((s, d) => s + d.expectedValue, 0);
          return (
            <div key={stage.key} className="min-w-[280px] w-[280px] shrink-0" onDragOver={handleDragOver} onDrop={() => handleDrop(stage.key)}>
              <div className={`rounded-xl ${stage.color} border p-3 min-h-[400px]`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{stage.label}</h3>
                    <Badge variant="outline" className="text-[10px] tabular-nums">{stageDeals.length}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums font-medium">€{(stageValue / 1000).toFixed(0)}k</span>
                </div>
                <div className="space-y-2">
                  {stageDeals.map(deal => (
                    <Link key={deal.id} to={`/deals/${deal.id}`} draggable onDragStart={() => handleDragStart(deal.id)}
                      className={`block bg-card rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${draggedDeal === deal.id ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-foreground leading-tight">{deal.companyName}</p>
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">{deal.partnerName}</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground tabular-nums">€{deal.expectedValue.toLocaleString()}</span>
                        <Badge variant="outline" className="text-[10px]">{deal.probability}%</Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {activityIcon(deal.lastActivityType)}
                          <span>{deal.assignedSalesperson.split(" ")[0]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {deal.agingDays > 45 && <span className="text-amber-600 font-medium">{deal.agingDays}d</span>}
                          <span>{deal.country}</span>
                        </div>
                      </div>
                      {deal.registrationStatus && (
                        <div className="mt-2 pt-2 border-t">
                          <Badge variant={deal.registrationStatus === "Approved" ? "success" : deal.registrationStatus === "Pending" ? "warning" : "destructive"} className="text-[10px]">
                            Reg: {deal.registrationStatus}
                          </Badge>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Won / Lost summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-reveal-up" style={{ animationDelay: "240ms" }}>
        {(["Won", "Lost"] as DealStage[]).map(stage => {
          const stageInfo = pipelineStages.find(s => s.key === stage)!;
          const stageDeals = filtered.filter(d => d.stage === stage);
          return (
            <div key={stage} className={`rounded-xl ${stageInfo.color} border p-4`}>
              <h3 className="text-sm font-semibold text-foreground mb-3">{stageInfo.label} ({stageDeals.length})</h3>
              <div className="space-y-2">
                {stageDeals.map(deal => (
                  <Link key={deal.id} to={`/deals/${deal.id}`} className="flex items-center justify-between bg-card rounded-lg border p-3 hover:shadow-sm transition-shadow">
                    <div>
                      <p className="text-sm font-medium text-foreground">{deal.companyName}</p>
                      <p className="text-[11px] text-muted-foreground">{deal.partnerName} · {deal.assignedSalesperson}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground">€{(deal.totalValue || deal.expectedValue).toLocaleString()}</span>
                  </Link>
                ))}
                {stageDeals.length === 0 && <p className="text-xs text-muted-foreground">No {stage.toLowerCase()} deals</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
