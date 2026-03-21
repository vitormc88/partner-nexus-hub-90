import { usePartners, type Partner } from "@/hooks/usePartners";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Search, Filter, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePartner } from "@/hooks/usePartners";
import { toast } from "sonner";

const statusVariant: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  Active: "success",
  Inactive: "secondary",
  Negotiation: "warning",
};

const getHealthVariant = (score: number) => {
  if (score >= 80) return "success" as const;
  if (score >= 60) return "info" as const;
  if (score >= 40) return "warning" as const;
  return "destructive" as const;
};

const getHealthLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "At Risk";
  return "Critical";
};

export default function Partners() {
  const { data: partners = [], isLoading } = usePartners();
  const createPartner = useCreatePartner();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ company_name: "", partner_code: "", country: "", partnership_level: "Reseller", status: "Active", primary_contact_name: "", primary_contact_email: "", notes: "" });

  const filtered = partners.filter((p) =>
    p.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.country || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.company_name || !form.partner_code) {
      toast.error("Company name and partner code are required");
      return;
    }
    try {
      await createPartner.mutateAsync(form);
      toast.success("Partner created successfully");
      setShowCreate(false);
      setForm({ company_name: "", partner_code: "", country: "", partnership_level: "Reseller", status: "Active", primary_contact_name: "", primary_contact_email: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to create partner");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-reveal-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Partner CRM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {partners.length} partners · {partners.filter((p) => p.status === "Active").length} active
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Partner
        </Button>
      </div>

      <div className="flex items-center gap-3 animate-reveal-up stagger-1">
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input type="text" placeholder="Search by company or country..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden animate-reveal-up stagger-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Country</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Level</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Revenue</th>
                <th className="text-right px-5 py-3 font-medium text-muted-foreground">Pipeline</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Health</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Clients</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">Loading partners...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">No partners found. <button onClick={() => setShowCreate(true)} className="text-primary hover:underline">Create your first partner</button></td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/partners/${p.id}`} className="font-medium text-foreground hover:text-primary transition-colors">{p.company_name}</Link>
                    <p className="text-[11px] text-muted-foreground">{p.partner_code}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.country}</td>
                  <td className="px-5 py-3"><Badge variant="outline" className="text-xs font-normal">{p.partnership_level}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={statusVariant[p.status || "Active"] || "secondary"}>{p.status}</Badge></td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground">€{Number(p.total_revenue || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">€{Number(p.pipeline_value || 0).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: (p.health_score ?? 50) >= 80 ? "hsl(var(--success))" : (p.health_score ?? 50) >= 60 ? "hsl(var(--info))" : (p.health_score ?? 50) >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }} />
                      <span className="text-xs">{p.health_score ?? 50}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground tabular-nums">{p.number_of_clients ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Partner Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Partner</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div><Label>Partner Code *</Label><Input value={form.partner_code} onChange={e => setForm(f => ({ ...f, partner_code: e.target.value }))} placeholder="e.g. PT-IBS" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
              <div>
                <Label>Partnership Level</Label>
                <Select value={form.partnership_level} onValueChange={v => setForm(f => ({ ...f, partnership_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reseller">Reseller</SelectItem>
                    <SelectItem value="Implementer">Implementer</SelectItem>
                    <SelectItem value="Strategic Connector">Strategic Connector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Primary Contact</Label><Input value={form.primary_contact_name} onChange={e => setForm(f => ({ ...f, primary_contact_name: e.target.value }))} /></div>
              <div><Label>Contact Email</Label><Input type="email" value={form.primary_contact_email} onChange={e => setForm(f => ({ ...f, primary_contact_email: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createPartner.isPending}>{createPartner.isPending ? "Creating..." : "Create Partner"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
