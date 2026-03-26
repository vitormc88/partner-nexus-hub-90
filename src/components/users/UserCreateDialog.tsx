import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { value: "hq_admin", label: "HQ Admin" },
  { value: "hq_standard", label: "HQ Standard" },
  { value: "partner_manager", label: "Partner Manager" },
  { value: "partner_admin", label: "Partner Admin" },
  { value: "partner_sales", label: "Partner Sales" },
  { value: "partner_restricted", label: "Partner Read Only" },
];

export function UserCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("partner_sales");
  const [partnerId, setPartnerId] = useState("none");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: partners } = useQuery({
    queryKey: ["partners-select"],
    queryFn: async () => {
      const { data } = await supabase.from("partners").select("id, company_name").order("company_name");
      return data || [];
    },
  });

  const isPartnerRole = role.startsWith("partner_");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setRole("partner_sales");
    setPartnerId("none");
  };

  const handleCreate = async () => {
    if (!fullName.trim()) { toast.error("Full name is required"); return; }
    if (!email.trim()) { toast.error("Email is required"); return; }
    if (isPartnerRole && partnerId === "none") { toast.error("Partner is required for partner users"); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role,
          partner_id: isPartnerRole && partnerId !== "none" ? partnerId : null,
          is_hq: !isPartnerRole,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Invitation sent to ${email}. The user will receive an email to set their password.`, {
        duration: 6000,
        icon: <Mail className="h-4 w-4" />,
      });
      qc.invalidateQueries({ queryKey: ["users-management"] });
      resetForm();
      onClose();
    } catch (e: any) {
      const message = e?.message || "Failed to create user";
      if (message.toLowerCase().includes("already") || message.toLowerCase().includes("exists")) {
        toast.error("A user with this email already exists");
      } else if (message.toLowerCase().includes("partner")) {
        toast.error("Partner is required for partner users");
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite New User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@company.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isPartnerRole && (
              <div>
                <Label>Linked Partner *</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Partner</SelectItem>
                    {partners?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                An invitation email will be sent to the user with a secure link to set their password. 
                The user's status will be <strong>Pending</strong> until they complete the setup.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              <Mail className="h-4 w-4 mr-2" />
              {saving ? "Sending Invite..." : "Send Invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
