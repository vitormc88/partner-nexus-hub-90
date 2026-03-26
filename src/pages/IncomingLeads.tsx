import { useState } from "react";
import { useIncomingLeads, useUpdateIncomingLead, useDeleteIncomingLead, type IncomingLead } from "@/hooks/useIncomingLeads";
import { usePartners } from "@/hooks/usePartners";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, ExternalLink, UserCheck, Building2, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function IncomingLeads() {
  const { data: leads = [], isLoading } = useIncomingLeads();
  const { data: partners = [] } = usePartners();
  const updateLead = useUpdateIncomingLead();
  const deleteLead = useDeleteIncomingLead();

  const [search, setSearch] = useState("");
  const [filterOwner, setFilterOwner] = useState("all");
  const [selectedLead, setSelectedLead] = useState<IncomingLead | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignPartnerId, setReassignPartnerId] = useState<string>("");

  const activePartners = partners.filter(p => p.is_active);

  const filtered = leads.filter(lead => {
    const matchesSearch = !search || [lead.company_name, lead.contact_name, lead.email, lead.country]
      .filter(Boolean).some(v => v!.toLowerCase().includes(search.toLowerCase()));
    const matchesOwner = filterOwner === "all" || lead.lead_owner_type === filterOwner;
    return matchesSearch && matchesOwner;
  });

  const handleReassign = () => {
    if (!selectedLead) return;
    const partnerId = reassignPartnerId === "__hq__" ? null : reassignPartnerId || null;
    const ownerType = partnerId ? "partner" : "HQ";
    updateLead.mutate(
      {
        id: selectedLead.id,
        linked_partner_id: partnerId,
        lead_owner_type: ownerType,
      },
      {
        onSuccess: () => {
          toast.success("Partner reassigned successfully");
          setReassignOpen(false);
          setSelectedLead(null);
          setReassignPartnerId("");
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteLead.mutate(id, {
      onSuccess: () => {
        toast.success("Lead deleted");
        setSelectedLead(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const PartnerBadge = ({ lead }: { lead: IncomingLead }) => {
    if (lead.partners) {
      return (
        <Badge variant="info" className="gap-1">
          <Building2 className="h-3 w-3" />
          {lead.partners.company_name}
        </Badge>
      );
    }
    return <Badge variant="ghost">HQ</Badge>;
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading incoming leads…</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Incoming Leads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          External leads ingested from SharpSpring and other sources.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company, contact, email…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterOwner} onValueChange={setFilterOwner}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Owner type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            <SelectItem value="HQ">HQ</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Country</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Assigned Partner</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 font-medium text-muted-foreground w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No incoming leads found.
                  </td>
                </tr>
              ) : (
                filtered.map(lead => (
                  <tr
                    key={lead.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {lead.company_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.contact_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.country || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PartnerBadge lead={lead} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.lead_owner_type || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.lead_source || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(lead.created_at), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLead && !reassignOpen} onOpenChange={open => { if (!open) setSelectedLead(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Lead Detail
              {selectedLead && <PartnerBadge lead={selectedLead} />}
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Company</Label>
                  <p className="font-medium">{selectedLead.company_name || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Contact</Label>
                  <p className="font-medium">{selectedLead.contact_name || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium">{selectedLead.email || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Phone</Label>
                  <p className="font-medium">{selectedLead.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Country</Label>
                  <p className="font-medium">{selectedLead.country || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Sector</Label>
                  <p className="font-medium">{selectedLead.sector || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Job Role</Label>
                  <p className="font-medium">{selectedLead.job_role || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Lead Source</Label>
                  <p className="font-medium">{selectedLead.lead_source || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Asset Range</Label>
                  <p className="font-medium">{selectedLead.asset_range || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Maintenance Team</Label>
                  <p className="font-medium">{selectedLead.maintenance_team_size || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Owner Type</Label>
                  <p className="font-medium">{selectedLead.lead_owner_type || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">SharpSpring ID</Label>
                  <p className="font-medium">{selectedLead.sharpspring_id || "—"}</p>
                </div>
              </div>

              {selectedLead.partners && (
                <div className="rounded-md bg-muted/50 p-3">
                  <Label className="text-muted-foreground text-xs">Assigned Partner Details</Label>
                  <p className="font-medium">{selectedLead.partners.company_name}</p>
                  {selectedLead.partners.country && (
                    <p className="text-sm text-muted-foreground">{selectedLead.partners.country}</p>
                  )}
                </div>
              )}

              {selectedLead.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Notes</Label>
                  <p className="text-sm">{selectedLead.notes}</p>
                </div>
              )}

              {selectedLead.routing_reason && (
                <div>
                  <Label className="text-muted-foreground text-xs">Routing Reason</Label>
                  <p className="text-sm">{selectedLead.routing_reason}</p>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(selectedLead.id)}
                  disabled={deleteLead.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setReassignPartnerId(selectedLead.linked_partner_id || "");
                    setReassignOpen(true);
                  }}
                >
                  <UserCheck className="h-4 w-4 mr-1" /> Reassign Partner
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={open => { if (!open) setReassignOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assigned Partner</Label>
              <Select value={reassignPartnerId || "__hq__"} onValueChange={setReassignPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select partner…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__hq__">
                    <span className="flex items-center gap-2">
                      <Badge variant="ghost" className="text-xs">HQ</Badge>
                      No partner (HQ owned)
                    </span>
                  </SelectItem>
                  {activePartners
                    .sort((a, b) => a.company_name.localeCompare(b.company_name))
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.company_name} {p.country ? `(${p.country})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
              <Button onClick={handleReassign} disabled={updateLead.isPending}>
                Save
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
