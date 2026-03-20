import { DollarSign, Users, TrendingUp, Activity, AlertTriangle, RefreshCcw, ArrowRight, Clock } from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { PartnerHealthList } from "@/components/dashboard/PartnerHealthList";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { partners } from "@/data/mock-data";
import { mockClients, getClientStats } from "@/data/clients-mock-data";
import { mockRenewals, mockNotifications } from "@/data/renewals-mock-data";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const totalRevenue = partners.reduce((s, p) => s + p.revenue, 0);
  const totalPipeline = partners.reduce((s, p) => s + p.pipeline, 0);
  const activePartners = partners.filter((p) => p.status === "Active").length;
  const clientStats = getClientStats(mockClients);

  const urgentRenewals = mockRenewals.filter(r => r.daysUntil <= 30 && r.status !== "Won" && r.status !== "Lost");
  const overdueRenewals = mockRenewals.filter(r => r.daysUntil < 0);
  const unreadNotifs = mockNotifications.filter(n => !n.isRead);

  const atRiskPartners = partners.filter(p => p.engagementScore < 40);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="animate-reveal-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Partner ecosystem overview · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* Alert Banner */}
      {(overdueRenewals.length > 0 || atRiskPartners.length > 0) && (
        <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 animate-reveal-up stagger-1">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Action Required</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {overdueRenewals.length > 0 && (
                <Link to="/renewals" className="text-xs text-destructive hover:underline">{overdueRenewals.length} overdue renewal{overdueRenewals.length > 1 ? "s" : ""}</Link>
              )}
              {atRiskPartners.length > 0 && (
                <Link to="/partners" className="text-xs text-destructive hover:underline">{atRiskPartners.length} partner{atRiskPartners.length > 1 ? "s" : ""} at risk</Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={`€${(totalRevenue / 1000).toFixed(0)}k`} change="+12.3% vs last quarter" changeType="positive" icon={DollarSign} delay={60} />
        <KPICard title="Active Partners" value={String(activePartners)} change={`of ${partners.length} total`} changeType="neutral" icon={Users} delay={120} />
        <KPICard title="Pipeline Value" value={`€${(totalPipeline / 1000).toFixed(0)}k`} change="+8.7% this month" changeType="positive" icon={TrendingUp} delay={180} />
        <KPICard title="Active Clients" value={String(clientStats.active)} change={`${clientStats.premium} premium`} changeType="neutral" icon={Activity} delay={240} />
      </div>

      {/* Renewals Urgency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-reveal-up stagger-2">
        <div className="bg-card rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">Renewals Due Soon</h3>
            <Link to="/renewals" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-2.5">
            {urgentRenewals.slice(0, 4).map(r => (
              <div key={r.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <Link to={`/clients/${r.clientId}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block">{r.clientCode}</Link>
                  <p className="text-[11px] text-muted-foreground truncate">{r.clientName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs tabular-nums font-semibold ${r.daysUntil < 0 ? "text-destructive" : "text-amber-600"}`}>
                    {r.daysUntil < 0 ? `${Math.abs(r.daysUntil)}d ago` : `${r.daysUntil}d`}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{r.renewalType}</Badge>
                </div>
              </div>
            ))}
            {urgentRenewals.length === 0 && <p className="text-xs text-muted-foreground">No urgent renewals</p>}
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">Renewal Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Next 30 days", value: clientStats.renewals30, color: "text-amber-600" },
              { label: "Next 60 days", value: clientStats.renewals60, color: "text-foreground" },
              { label: "Next 90 days", value: clientStats.renewals90, color: "text-foreground" },
              { label: "Overdue", value: clientStats.overdue, color: "text-destructive" },
            ].map(item => (
              <div key={item.label} className="text-center p-2 rounded-lg bg-secondary/50">
                <p className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">Recent Alerts</h3>
            <Link to="/notifications" className="text-xs text-primary hover:underline">All →</Link>
          </div>
          <div className="space-y-2.5">
            {unreadNotifs.slice(0, 4).map(n => (
              <div key={n.id} className="flex items-start gap-2">
                <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${n.type === "danger" ? "bg-destructive" : n.type === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                <p className="text-xs text-muted-foreground line-clamp-2">{n.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <PartnerHealthList />
      </div>

      <RecentActivity />
    </div>
  );
}
