import { useState } from "react";
import { Link } from "react-router-dom";
import { mockDeals } from "@/data/deals-mock-data";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, XCircle, Search, AlertTriangle } from "lucide-react";

const statusConfig = {
  Pending: { variant: "warning" as const, icon: Clock },
  Approved: { variant: "success" as const, icon: ShieldCheck },
  Rejected: { variant: "destructive" as const, icon: XCircle },
};

export default function DealRegistrations() {
  const [filter, setFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("all");
  const registeredDeals = mockDeals.filter(d => d.registrationStatus);

  const filtered = filter === "all" ? registeredDeals : registeredDeals.filter(d => d.registrationStatus === filter);
  const pending = registeredDeals.filter(d => d.registrationStatus === "Pending").length;

  // Simple duplicate detection
  const duplicateGroups = new Map<string, typeof registeredDeals>();
  registeredDeals.forEach(d => {
    const key = d.companyName.toLowerCase().replace(/\s+/g, "");
    if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
    duplicateGroups.get(key)!.push(d);
  });
  const conflicts = [...duplicateGroups.values()].filter(g => g.length > 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="animate-reveal-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Deal Registrations</h1>
        <p className="text-sm text-muted-foreground mt-1">{registeredDeals.length} registrations · {pending} pending approval</p>
      </div>

      {conflicts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Potential Conflicts Detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">{conflicts.length} company name{conflicts.length > 1 ? "s" : ""} appear in multiple registrations</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 animate-reveal-up" style={{ animationDelay: "90ms" }}>
        {(["all", "Pending", "Approved", "Rejected"] as const).map(status => (
          <button key={status} onClick={() => setFilter(status)}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${filter === status ? "bg-primary text-primary-foreground" : "bg-card border text-muted-foreground hover:bg-secondary"}`}>
            {status === "all" ? "All" : status} {status === "Pending" && pending > 0 && `(${pending})`}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden animate-reveal-up" style={{ animationDelay: "120ms" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Company</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Partner</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Country</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Value</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-5 py-3 font-medium text-muted-foreground">Submitted</th>
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(deal => {
              const cfg = statusConfig[deal.registrationStatus!];
              const StatusIcon = cfg.icon;
              return (
                <tr key={deal.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/deals/${deal.id}`} className="font-medium text-foreground hover:text-primary transition-colors">{deal.companyName}</Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{deal.partnerName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{deal.country}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">€{deal.expectedValue.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <Badge variant={cfg.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {deal.registrationStatus}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(deal.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-5 py-3 text-right">
                    {deal.registrationStatus === "Pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <button className="h-7 px-2.5 rounded-md bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 transition-colors active:scale-95">Approve</button>
                        <button className="h-7 px-2.5 rounded-md border text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors active:scale-95">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
