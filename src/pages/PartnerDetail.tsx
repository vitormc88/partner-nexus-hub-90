import { useParams, Link } from "react-router-dom";
import { usePartner } from "@/hooks/usePartners";
import { useClients } from "@/hooks/useClients";
import { useDeals } from "@/hooks/useDeals";
import { useRenewals } from "@/hooks/useDeals";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, MapPin, Calendar, TrendingUp, Users, DollarSign, Building2, Kanban, RefreshCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusVariant: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  Active: "success", Inactive: "secondary", Negotiation: "warning",
};

export default function PartnerDetail() {
  const { id } = useParams();
  const { data: partner, isLoading } = usePartner(id);
  const { data: clients = [] } = useClients({ partner_id: id });
  const { data: deals = [] } = useDeals({ partner_id: id });
  const { data: renewals = [] } = useRenewals();
  const { data: certs = [] } = useQuery({
    queryKey: ["partner_certs", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from("partner_certifications").select("*").eq("partner_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const partnerRenewals = renewals.filter((r: any) => r.partner_id === id);

  if (isLoading) return <div className="max-w-5xl mx-auto py-12 text-center text-muted-foreground">Loading...</div>;

  if (!partner) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">Partner not found</p>
        <Link to="/partners" className="text-primary text-sm mt-2 inline-block hover:underline">← Back to Partners</Link>
      </div>
    );
  }

  const score = partner.health_score ?? 50;
  const healthLabel = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "At Risk" : "Critical";
  const healthVariant = score >= 80 ? "success" : score >= 60 ? "info" : score >= 40 ? "warning" : "destructive";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="animate-reveal-up">
        <Link to="/partners" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Partners
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{partner.company_name}</h1>
              <Badge variant={statusVariant[partner.status || "Active"] || "secondary"}>{partner.status}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{partner.country}</span>
              {partner.start_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Since {partner.start_date}</span>}
              <Badge variant="outline" className="font-normal">{partner.partnership_level}</Badge>
              <span className="font-mono text-xs">{partner.partner_code}</span>
            </div>
          </div>
          <Badge variant={healthVariant as any} className="text-sm px-3 py-1">
            Health: {score}/100 · {healthLabel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-reveal-up stagger-1">
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><DollarSign className="h-4 w-4" /><span className="text-sm font-medium">Revenue YTD</span></div>
          <p className="text-2xl font-bold tabular-nums text-foreground">€{Number(partner.revenue_ytd || 0).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><TrendingUp className="h-4 w-4" /><span className="text-sm font-medium">Pipeline</span></div>
          <p className="text-2xl font-bold tabular-nums text-foreground">€{Number(partner.pipeline_value || 0).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><Users className="h-4 w-4" /><span className="text-sm font-medium">Clients</span></div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{clients.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2"><Kanban className="h-4 w-4" /><span className="text-sm font-medium">Open Deals</span></div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{deals.filter(d => d.status === "Open").length}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="animate-reveal-up stagger-2">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
          <TabsTrigger value="renewals">Renewals ({partnerRenewals.length})</TabsTrigger>
          <TabsTrigger value="certifications">Certifications ({certs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border shadow-sm p-5 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Partner Info</h3>
              {[
                ["Legal Name", partner.legal_name],
                ["Contact", partner.primary_contact_name],
                ["Email", partner.primary_contact_email],
                ["Phone", partner.phone],
                ["Website", partner.website],
                ["Region", partner.region],
                ["Alert Days", partner.alert_notice_days],
                ["Onboarding", partner.onboarding_status],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-start gap-3 py-1 border-b border-border/40 last:border-0">
                  <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
                  <span className="text-sm text-foreground">{value || "—"}</span>
                </div>
              ))}
            </div>
            {partner.notes && (
              <div className="bg-card rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-foreground text-sm mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground">{partner.notes}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-5">
          {clients.length === 0 ? (
            <div className="bg-card rounded-xl border shadow-sm p-8 text-center text-muted-foreground">No clients linked to this partner.</div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-secondary/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Country</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Sector</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">License</th>
                </tr></thead>
                <tbody className="divide-y">
                  {clients.map(c => (
                    <tr key={c.id} className="hover:bg-secondary/30">
                      <td className="px-5 py-3"><Link to={`/clients/${c.id}`} className="font-medium hover:text-primary">{c.commercial_name}</Link><p className="text-[11px] text-muted-foreground font-mono">{c.client_code}</p></td>
                      <td className="px-5 py-3 text-muted-foreground">{c.country}</td>
                      <td className="px-5 py-3 text-muted-foreground">{c.sector}</td>
                      <td className="px-5 py-3"><Badge variant={c.status === "Active" ? "default" : "secondary"}>{c.status}</Badge></td>
                      <td className="px-5 py-3"><Badge variant="outline" className="text-xs">{c.license_type || "—"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="deals" className="mt-5">
          {deals.length === 0 ? (
            <div className="bg-card rounded-xl border shadow-sm p-8 text-center text-muted-foreground">No deals found.</div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-secondary/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Stage</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                </tr></thead>
                <tbody className="divide-y">
                  {deals.map(d => (
                    <tr key={d.id} className="hover:bg-secondary/30">
                      <td className="px-5 py-3"><Link to={`/deals/${d.id}`} className="font-medium hover:text-primary">{d.company_name}</Link></td>
                      <td className="px-5 py-3"><Badge variant="outline">{d.stage}</Badge></td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">€{Number(d.expected_value || 0).toLocaleString()}</td>
                      <td className="px-5 py-3"><Badge variant={d.status === "Won" ? "success" : d.status === "Lost" ? "destructive" : "default"}>{d.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="renewals" className="mt-5">
          {partnerRenewals.length === 0 ? (
            <div className="bg-card rounded-xl border shadow-sm p-8 text-center text-muted-foreground">No renewals found.</div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-secondary/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Value</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Priority</th>
                </tr></thead>
                <tbody className="divide-y">
                  {partnerRenewals.map((r: any) => (
                    <tr key={r.id} className="hover:bg-secondary/30">
                      <td className="px-5 py-3"><Badge variant="outline">{r.renewal_type}</Badge></td>
                      <td className="px-5 py-3 tabular-nums">{r.renewal_date}</td>
                      <td className="px-5 py-3"><Badge variant="secondary">{r.status}</Badge></td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">€{Number(r.estimated_value || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs">{r.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="certifications" className="mt-5">
          {certs.length === 0 ? (
            <div className="bg-card rounded-xl border shadow-sm p-8 text-center text-muted-foreground">No certifications yet.</div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-secondary/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Certification</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Level</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Score</th>
                </tr></thead>
                <tbody className="divide-y">
                  {certs.map(c => (
                    <tr key={c.id} className="hover:bg-secondary/30">
                      <td className="px-5 py-3 font-medium">{c.user_name}<p className="text-[11px] text-muted-foreground">{c.user_email}</p></td>
                      <td className="px-5 py-3">{c.certification_name}</td>
                      <td className="px-5 py-3">Level {c.certification_level}</td>
                      <td className="px-5 py-3"><Badge variant={c.status === "Completed" ? "success" : "secondary"}>{c.status}</Badge></td>
                      <td className="px-5 py-3 tabular-nums">{c.score ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {score < 40 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-5 animate-reveal-up">
          <h3 className="font-semibold text-foreground flex items-center gap-2">⚠️ Smart Insight</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This partner's health score is {score}/100. Consider scheduling a re-engagement call or reviewing the partnership terms.
          </p>
        </div>
      )}
    </div>
  );
}
