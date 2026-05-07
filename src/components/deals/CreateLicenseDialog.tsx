import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  LICENSE_TYPE_OPTIONS,
  createLicenseAndRenewal,
  computeRenewalDate,
  type LicenseModel,
  type BillingFrequency,
} from "@/lib/lifecycle";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  dealId?: string;
  onSkip?: () => void;
}

export function CreateLicenseDialog({ open, onOpenChange, clientId, dealId, onSkip }: Props) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    license_type: "Professional 1",
    license_model: "SaaS / UseIT" as LicenseModel,
    contract_start_date: new Date().toISOString().slice(0, 10),
    renewal_date: "",
    contract_value: "",
    billing_frequency: "Annual" as BillingFrequency,
    num_users: "",
    notes: "",
  });

  const autoRenewal = computeRenewalDate(form.contract_start_date, form.license_model, form.billing_frequency);

  const submit = async (mode: "save_renewal" | "draft" | "skip") => {
    if (mode === "skip") {
      onSkip?.();
      onOpenChange(false);
      return;
    }
    setSubmitting(true);
    try {
      await createLicenseAndRenewal(
        {
          client_id: clientId,
          license_type: form.license_type,
          license_model: form.license_model,
          contract_start_date: form.contract_start_date,
          renewal_date: form.renewal_date || autoRenewal,
          contract_value: form.contract_value ? Number(form.contract_value) : null,
          billing_frequency: form.billing_frequency,
          num_users: form.num_users ? Number(form.num_users) : null,
          notes: form.notes || null,
          is_draft: mode === "draft",
        },
        { dealId, createRenewal: mode === "save_renewal" }
      );
      toast.success(mode === "draft" ? "License saved as draft" : "License & renewal created");
      qc.invalidateQueries({ queryKey: ["licenses"] });
      qc.invalidateQueries({ queryKey: ["renewals"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["deal_activities", dealId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create license");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Client License</DialogTitle>
          <DialogDescription>
            Set up the initial license. A renewal record will be auto-generated based on the model and frequency.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div>
            <Label>License Type</Label>
            <Select value={form.license_type} onValueChange={(v) => setForm((f) => ({ ...f, license_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LICENSE_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>License Model</Label>
            <Select value={form.license_model} onValueChange={(v) => setForm((f) => ({ ...f, license_model: v as LicenseModel }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SaaS / UseIT">SaaS / UseIT</SelectItem>
                <SelectItem value="Perpetual / KeepIT">Perpetual / KeepIT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Contract Start Date</Label>
            <Input type="date" value={form.contract_start_date} onChange={(e) => setForm((f) => ({ ...f, contract_start_date: e.target.value }))} />
          </div>
          <div>
            <Label>Renewal Date</Label>
            <Input type="date" value={form.renewal_date || autoRenewal || ""} onChange={(e) => setForm((f) => ({ ...f, renewal_date: e.target.value }))} />
          </div>

          <div>
            <Label>Billing Frequency</Label>
            <Select value={form.billing_frequency} onValueChange={(v) => setForm((f) => ({ ...f, billing_frequency: v as BillingFrequency }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Annual">Annual</SelectItem>
                <SelectItem value="Monthly">Monthly</SelectItem>
                <SelectItem value="One-time">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contract Value (€)</Label>
            <Input type="number" min={0} value={form.contract_value} onChange={(e) => setForm((f) => ({ ...f, contract_value: e.target.value }))} />
          </div>

          <div>
            <Label>Number of users / licenses</Label>
            <Input type="number" min={0} value={form.num_users} onChange={(e) => setForm((f) => ({ ...f, num_users: e.target.value }))} />
          </div>
          <div />

          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="ghost" disabled={submitting} onClick={() => submit("skip")}>Skip for now</Button>
          <Button variant="outline" disabled={submitting} onClick={() => submit("draft")}>Save as Draft</Button>
          <Button disabled={submitting} onClick={() => submit("save_renewal")}>Save & Create Renewal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
