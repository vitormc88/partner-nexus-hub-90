import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, Users, FileText, Eye, KeyRound, IdCard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useClient, useClientContacts, useClientLicenses, useClientContracts } from "@/hooks/useClients";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function FieldRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-40 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const { data: contacts = [] } = useClientContacts(id);
  const { data: licenses = [] } = useClientLicenses(id);
  const { data: contracts = [] } = useClientContracts(id);
  const { data: notes = [] } = useQuery({
    queryKey: ["client_notes", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from("client_notes").select("*").eq("client_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
  const { data: credentials = [] } = useQuery({
    queryKey: ["client_credentials", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from("client_credentials").select("*").eq("client_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["licensed_modules", id, licenses],
    queryFn: async () => {
      if (!licenses.length) return [];
      const ids = licenses.map(l => l.id);
      const { data, error } = await supabase.from("licensed_modules").select("*").in("license_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: licenses.length > 0,
  });

  if (isLoading) return <div className="max-w-4xl mx-auto py-20 text-center text-muted-foreground">Loading...</div>;

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clients")}>Back to Clients</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="animate-reveal-up flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")} className="mt-0.5"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{client.commercial_name}</h1>
              {client.is_premium && <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 gap-1"><Star className="h-3 w-3" /> Premium</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{client.client_code}</span>
              <span>•</span>
              <span>{client.country}</span>
            </div>
          </div>
        </div>
        <Badge variant={client.status === "Active" ? "default" : "secondary"}>{client.status}</Badge>
      </div>

      <Tabs defaultValue="client" className="animate-reveal-up" style={{ animationDelay: "80ms" }}>
        <TabsList className="grid w-full grid-cols-6 h-10">
          <TabsTrigger value="client" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Client</TabsTrigger>
          <TabsTrigger value="identification" className="gap-1.5 text-xs"><IdCard className="h-3.5 w-3.5" /> Identification</TabsTrigger>
          <TabsTrigger value="licensing" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Licensing</TabsTrigger>
          <TabsTrigger value="contract" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Contract</TabsTrigger>
          <TabsTrigger value="observations" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Observations</TabsTrigger>
          <TabsTrigger value="credentials" className="gap-1.5 text-xs"><KeyRound className="h-3.5 w-3.5" /> Credentials</TabsTrigger>
        </TabsList>

        {/* Client Tab */}
        <TabsContent value="client" className="space-y-5 mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Company Information</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <FieldRow label="Client Code" value={client.client_code} mono />
                <FieldRow label="Short Name" value={client.short_name} />
                <FieldRow label="Commercial Name" value={client.commercial_name} />
                <FieldRow label="Phone" value={client.phone} />
                <FieldRow label="Email" value={client.email} />
                <FieldRow label="Website" value={client.website} />
                <FieldRow label="Address" value={client.address} />
                <FieldRow label="City" value={client.city} />
                <FieldRow label="Country" value={client.country} />
                <FieldRow label="Sector" value={client.sector} />
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Contacts ({contacts.length})</CardTitle></CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No contacts registered</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map(ct => (
                      <div key={ct.id} className="rounded-lg border border-border/60 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{ct.contact_name}</span>
                          <span className="text-xs text-muted-foreground">{ct.role_function}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {ct.phone && <span>📞 {ct.phone}</span>}
                          {ct.mobile && <span>📱 {ct.mobile}</span>}
                          {ct.email && <span>✉️ {ct.email}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Identification Tab */}
        <TabsContent value="identification" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Management</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <FieldRow label="Manager / Owner" value={client.manager_owner} />
                <FieldRow label="Account Manager" value={client.account_manager} />
                <FieldRow label="Installation Location" value={client.installation_location} />
                <FieldRow label="First Installation" value={client.first_installation_date} />
                <FieldRow label="First Version" value={client.first_installed_version} />
                <FieldRow label="Current Version" value={client.current_version} />
                <FieldRow label="Award / PO Reference" value={client.award_reference} mono />
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Flags & Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Premium Client", checked: client.is_premium },
                  { label: "Custom Reports", checked: client.has_custom_reports },
                  { label: "Custom Routine", checked: client.has_custom_routine },
                  { label: "Inactive", checked: client.is_inactive },
                  { label: "Auto Update", checked: client.auto_update },
                ].map(flag => (
                  <div key={flag.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-sm text-foreground">{flag.label}</span>
                    <Switch checked={flag.checked} disabled />
                  </div>
                ))}
                <div className="pt-3">
                  <span className="text-xs text-muted-foreground block mb-1">Deployment</span>
                  <Badge variant="secondary">{client.cloud_onpremise}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Licensing Tab */}
        <TabsContent value="licensing" className="space-y-5 mt-5">
          {licenses.length === 0 ? (
            <Card className="border-border/60 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No license records found.</CardContent></Card>
          ) : licenses.map(lic => (
            <Card key={lic.id} className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {lic.product} — {lic.license_model}
                  <Badge variant="secondary" className="text-xs">{lic.version}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div className="space-y-0">
                    <FieldRow label="Database Type" value={lic.database_type} />
                    <FieldRow label="License Start" value={lic.license_start_date} />
                    <FieldRow label="License End" value={lic.license_end_date} />
                    <FieldRow label="Model" value={lic.license_model} />
                    <FieldRow label="Periodicity" value={lic.periodicity} />
                  </div>
                  <div className="space-y-0">
                    <FieldRow label="SAT Active" value={lic.sat_active ? "Yes" : "No"} />
                    <FieldRow label="SAT End Date" value={lic.sat_end_date} />
                    <FieldRow label="BackOffice Users" value={lic.backoffice_users} />
                    <FieldRow label="Employee Users" value={lic.backoffice_employee_users} />
                    <FieldRow label="Mobile Users" value={lic.mobile_users} />
                    <FieldRow label="Web Accesses" value={lic.web_accesses} />
                    <FieldRow label="API Access" value={lic.api_access ? "Yes" : "No"} />
                  </div>
                </div>
                {modules.filter(m => m.license_id === lic.id).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Licensed Modules</h4>
                    <Table>
                      <TableHeader><TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Module</TableHead>
                        <TableHead className="text-xs">Enabled</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Period</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {modules.filter(m => m.license_id === lic.id).map(mod => (
                          <TableRow key={mod.id}>
                            <TableCell className="text-sm font-medium">{mod.module_name}</TableCell>
                            <TableCell><Switch checked={mod.enabled} disabled className="scale-75" /></TableCell>
                            <TableCell className="text-xs">{mod.license_type || "—"}</TableCell>
                            <TableCell className="text-xs">{mod.periodicity || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Contract Tab */}
        <TabsContent value="contract" className="space-y-5 mt-5">
          {contracts.length === 0 ? (
            <Card className="border-border/60 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">No contract records found.</CardContent></Card>
          ) : contracts.map(co => (
            <Card key={co.id} className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Contract — {co.contract_start_date} to {co.contract_end_date}
                  <Badge variant="secondary" className="ml-2 text-xs">{co.currency}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div className="space-y-0">
                    <FieldRow label="Price Table" value={co.price_table_reference} mono />
                    <FieldRow label="Start Date" value={co.contract_start_date} />
                    <FieldRow label="End Date" value={co.contract_end_date} />
                    <FieldRow label="Notice Period" value={co.notice_period_days ? `${co.notice_period_days} days` : "—"} />
                    <FieldRow label="Installments" value={co.num_installments} />
                    <FieldRow label="Renewal Increase" value={co.renewal_increase_pct ? `${co.renewal_increase_pct}%` : "—"} />
                  </div>
                  <div className="space-y-0">
                    <FieldRow label="Contract Value" value={`€${Number(co.contract_value || 0).toLocaleString()}`} />
                    <FieldRow label="Invoiced Value" value={`€${Number(co.invoiced_value || 0).toLocaleString()}`} />
                    <FieldRow label="Hosting Value" value={co.hosting_value ? `€${Number(co.hosting_value).toLocaleString()}` : "—"} />
                    <FieldRow label="SAT Value" value={co.sat_value ? `€${Number(co.sat_value).toLocaleString()}` : "—"} />
                    <FieldRow label="Total Value" value={<span className="font-semibold">€{Number(co.total_value || 0).toLocaleString()}</span>} />
                  </div>
                </div>
                {co.observations && (
                  <div className="mt-4"><p className="text-xs font-medium text-muted-foreground mb-1">Observations</p><p className="text-sm text-foreground">{co.observations}</p></div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Observations Tab */}
        <TabsContent value="observations" className="mt-5">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Notes & Observations</CardTitle></CardHeader>
            <CardContent>
              {client.observations && (
                <div className="rounded-lg bg-secondary/50 p-4 mb-4"><p className="text-sm text-foreground">{client.observations}</p></div>
              )}
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No additional notes</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((n: any) => (
                    <div key={n.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px]">{n.note_type}</Badge>
                        <span className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-foreground">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="mt-5">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">System Credentials</CardTitle></CardHeader>
            <CardContent>
              {credentials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No credentials stored</p>
              ) : (
                <div className="space-y-4">
                  {credentials.map((cr: any) => (
                    <div key={cr.id} className="border rounded-lg p-4 space-y-2">
                      <FieldRow label="System URL" value={cr.system_url} />
                      <FieldRow label="Username" value={cr.username} />
                      <FieldRow label="Login" value={cr.login} />
                      <FieldRow label="Environment" value={cr.environment_type} />
                      {cr.admin_notes && <FieldRow label="Admin Notes" value={cr.admin_notes} />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
