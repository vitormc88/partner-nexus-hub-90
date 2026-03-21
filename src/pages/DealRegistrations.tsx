import { useState } from "react";
import { Link } from "react-router-dom";
import { useDealRegistrations } from "@/hooks/useCommissions";
import { usePartners } from "@/hooks/usePartners";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusConfig = {
  Pending: { variant: "warning" as const, icon: Clock },
  Approved: { variant: "success" as const, icon: ShieldCheck },
  Rejected: { variant: "destructive" as const, icon: XCircle },
};

export default function DealRegistrations() {
  const [filter, setFilter] = useState<"all" | "Pending" | "Approved" | "Rejected">("all");
  const { data: registrations = [], isLoading } = useDealRegistrations();
  const { data: partners = [] } = usePartners();
  const queryClient = useQueryClient();

  const partnerMap = new Map(partners.map(p => [p.id, p.company_name]));
  const filtered = filter === "all" ? registrations : registrations.filter(r => r.registration_status === filter);
  const pending = registrations.filter(r => r.registration_status === "Pending").length;

  // Duplicate detection
  const nameGroups = new Map<string, typeof registrations>();
  registrations.forEach(r => {
    const key = ((r.deals as any)?.company_name || "").toLowerCase().replace(/\s+/g, "");
    if (!key) return;
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key)!.push(r);
  });
  const conflicts = [...nameGroups.values()].filter(g => g.length > 1);

  const handleAction = async (id: string, status: "Approved" | "Rejected") => {
    const { error } = await supabase.from("deal_registrations").update({
      registration_status: status,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Registration ${status.toLowerCase()}`);
    queryClient.invalidateQueries({ queryKey: ["deal_registrations"] });
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="animate-reveal-up">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Deal Registrations</h1>
        <p className="text-sm text-muted-foreground mt-1">{registrations.length} registrations · {pending} pending approval</p>
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
            {filtered.map(reg => {
              const deal = reg.deals as any;
              const cfg = statusConfig[reg.registration_status as keyof typeof statusConfig] || statusConfig.Pending;
              const StatusIcon = cfg.icon;
              return (
                <tr key={reg.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/deals/${reg.deal_id}`} className="font-medium text-foreground hover:text-primary transition-colors">{deal?.company_name || "—"}</Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{partnerMap.get(reg.partner_id) || reg.partner_id}</td>
                  <td className="px-5 py-3 text-muted-foreground">{deal?.country || "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">€{(deal?.expected_value || 0).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <Badge variant={cfg.variant} className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {reg.registration_status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(reg.submitted_at).toLocaleDateString("en-GB")}</td>
                  <td className="px-5 py-3 text-right">
                    {reg.registration_status === "Pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleAction(reg.id, "Approved")} className="h-7 px-2.5 rounded-md bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 transition-colors active:scale-95">Approve</button>
                        <button onClick={() => handleAction(reg.id, "Rejected")} className="h-7 px-2.5 rounded-md border text-[11px] font-medium text-muted-foreground hover:bg-secondary transition-colors active:scale-95">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">No registrations found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
