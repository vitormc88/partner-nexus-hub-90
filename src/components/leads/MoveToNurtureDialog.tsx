import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateIncomingLead } from "@/hooks/useIncomingLeads";
import { NURTURE_PRESETS } from "@/lib/qualification";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string;
}

function plusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function MoveToNurtureDialog({ open, onOpenChange, leadId }: Props) {
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState("");
  const updateLead = useUpdateIncomingLead();

  const activePreset = NURTURE_PRESETS.find((p) => p.key === presetKey) || null;

  const pickPreset = (key: string) => {
    const p = NURTURE_PRESETS.find((x) => x.key === key);
    if (!p) return;
    setPresetKey(key);
    setReason((prev) => (prev.trim() ? prev : `${p.label} — ${p.description}`));
    setUntil(plusDays(p.revisitDays));
  };

  const submit = () => {
    // Nurture is a qualification/status decision only.
    // Engagement status (Unreachable / Silent / In Conversation) is derived
    // from contact attempts and must NOT be overwritten here.
    updateLead.mutate(
      {
        id: leadId,
        status: "Nurture",
        nurture_reason: reason.trim() || null,
        nurture_until: until || null,
      } as any,
      {
        onSuccess: () => {
          toast.success("Moved to nurture");
          setReason("");
          setUntil("");
          setPresetKey(null);
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-success" /> Move to nurture
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nurture is part of healthy pipeline management — not a failure. Pick a context
            below to set a sensible revisit window and suggested follow-up angle.
          </p>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Why nurture?
            </Label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {NURTURE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => pickPreset(p.key)}
                  className={cn(
                    "text-left rounded-md border px-2.5 py-2 transition",
                    presetKey === p.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <div className="text-xs font-medium text-foreground">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
            {activePreset && (
              <p className="mt-2 text-[11px] text-muted-foreground italic">
                Suggested angle: {activePreset.angle}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Reason / context</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional — short context that future-you will thank present-you for."
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Revisit on</Label>
            <Input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="mt-1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              The lead stays searchable and surfaces gently as the date approaches.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={updateLead.isPending}>
            {updateLead.isPending ? "Saving…" : "Move to nurture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
