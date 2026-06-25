import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar as CalIcon, Users, ListChecks, AlertTriangle, MessageSquare, Tag } from "lucide-react";
import { useAddPartnerNote, INTERACTION_TYPES, type InteractionType, type Participant, type ActionItem } from "@/hooks/usePartnerNotes";
import { usePartnerUsers } from "@/hooks/usePartnerUsers";
import { useHQUsers } from "@/hooks/useHQUsers";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function RelationshipEntryDialog({ open, onOpenChange, partnerId }: Props) {
  const addNote = useAddPartnerNote();
  const { data: partnerUsers = [] } = usePartnerUsers(partnerId);
  const { data: hqUsers = [] } = useHQUsers();

  const allUsers = useMemo(
    () => [
      ...hqUsers.map((u: any) => ({ id: u.id, name: u.full_name || u.email })),
      ...partnerUsers.map((u: any) => ({ id: u.id, name: u.full_name || u.email })),
    ],
    [hqUsers, partnerUsers],
  );

  const [interactionType, setInteractionType] = useState<InteractionType>("Meeting");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantDraft, setParticipantDraft] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [topicDraft, setTopicDraft] = useState("");
  const [decisions, setDecisions] = useState<string[]>([]);
  const [decisionDraft, setDecisionDraft] = useState("");
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [riskDraft, setRiskDraft] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setInteractionType("Meeting");
      setDate(new Date().toISOString().slice(0, 16));
      setParticipants([]); setParticipantDraft("");
      setTopics([]); setTopicDraft("");
      setDecisions([]); setDecisionDraft("");
      setActions([]);
      setRisks([]); setRiskDraft("");
      setNotes("");
    }
  }, [open]);

  const addParticipant = (raw?: string) => {
    const value = (raw ?? participantDraft).trim();
    if (!value) return;
    const match = allUsers.find(u => u.name?.toLowerCase() === value.toLowerCase());
    setParticipants(p =>
      match
        ? [...p, { kind: "user", id: match.id, name: match.name }]
        : [...p, { kind: "external", name: value }],
    );
    setParticipantDraft("");
  };

  const addFromList = (item: string, setter: (fn: (arr: string[]) => string[]) => void, reset: () => void) => {
    const v = item.trim();
    if (!v) return;
    setter(arr => [...arr, v]);
    reset();
  };

  const addAction = () => {
    setActions(a => [...a, { id: uid(), description: "", owner: null, due_date: null, status: "Open" }]);
  };
  const updateAction = (id: string, patch: Partial<ActionItem>) =>
    setActions(a => a.map(x => (x.id === id ? { ...x, ...patch } : x)));
  const removeAction = (id: string) => setActions(a => a.filter(x => x.id !== id));

  const canSave =
    notes.trim().length > 0 ||
    topics.length > 0 ||
    decisions.length > 0 ||
    actions.some(a => a.description.trim());

  const submit = async () => {
    if (!canSave) {
      toast.error("Add at least one topic, decision, action, or note");
      return;
    }
    try {
      await addNote.mutateAsync({
        partner_id: partnerId,
        interaction_type: interactionType,
        interaction_date: new Date(date).toISOString(),
        participants,
        topics,
        decisions,
        action_items: actions.filter(a => a.description.trim()),
        risks,
        content: notes.trim(),
      });
      toast.success("Relationship entry saved");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save entry");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Relationship Entry</DialogTitle>
          <DialogDescription>
            Capture what happened, what was decided, and what needs to happen next.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Type + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={interactionType} onValueChange={(v) => setInteractionType(v as InteractionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><CalIcon className="h-3.5 w-3.5" />Date</Label>
              <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          {/* Participants */}
          <section className="space-y-2">
            <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Participants</Label>
            <div className="flex flex-wrap gap-1.5">
              {participants.map((p, i) => (
                <Badge key={i} variant={p.kind === "user" ? "secondary" : "outline"} className="gap-1">
                  {p.name}
                  <button onClick={() => setParticipants(arr => arr.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                list="entry-participants-list"
                value={participantDraft}
                onChange={e => setParticipantDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addParticipant(); } }}
                placeholder="Add internal user or external attendee…"
              />
              <datalist id="entry-participants-list">
                {allUsers.map(u => <option key={u.id} value={u.name} />)}
              </datalist>
              <Button type="button" variant="outline" size="sm" onClick={() => addParticipant()}>Add</Button>
            </div>
          </section>

          {/* Topics */}
          <ChipList
            icon={<Tag className="h-3.5 w-3.5" />}
            label="Topics discussed"
            placeholder="e.g. Khazanah, SAP Integration"
            items={topics}
            draft={topicDraft}
            setDraft={setTopicDraft}
            onAdd={() => addFromList(topicDraft, setTopics, () => setTopicDraft(""))}
            onRemove={(i) => setTopics(arr => arr.filter((_, idx) => idx !== i))}
          />

          {/* Decisions */}
          <ChipList
            icon={<ListChecks className="h-3.5 w-3.5" />}
            label="Key decisions"
            placeholder="e.g. Proposal approved"
            items={decisions}
            draft={decisionDraft}
            setDraft={setDecisionDraft}
            onAdd={() => addFromList(decisionDraft, setDecisions, () => setDecisionDraft(""))}
            onRemove={(i) => setDecisions(arr => arr.filter((_, idx) => idx !== i))}
            stacked
          />

          {/* Action items */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" />Action items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addAction}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add action
              </Button>
            </div>
            {actions.length === 0 && (
              <p className="text-xs text-muted-foreground">No actions yet. Add what needs to happen next.</p>
            )}
            <div className="space-y-2">
              {actions.map(a => (
                <div key={a.id} className="rounded-md border bg-card p-2.5 space-y-2">
                  <div className="flex gap-2 items-start">
                    <Input
                      value={a.description}
                      onChange={e => updateAction(a.id, { description: e.target.value })}
                      placeholder="Action description"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeAction(a.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      list="entry-participants-list"
                      value={a.owner ?? ""}
                      onChange={e => updateAction(a.id, { owner: e.target.value || null })}
                      placeholder="Owner"
                      className="h-8 text-xs"
                    />
                    <Input
                      type="date"
                      value={a.due_date ?? ""}
                      onChange={e => updateAction(a.id, { due_date: e.target.value || null })}
                      className="h-8 text-xs"
                    />
                    <Select value={a.status} onValueChange={(v) => updateAction(a.id, { status: v as ActionItem["status"] })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Risks */}
          <ChipList
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Risks / concerns"
            placeholder="e.g. Customer budget delayed"
            items={risks}
            draft={riskDraft}
            setDraft={setRiskDraft}
            onAdd={() => addFromList(riskDraft, setRisks, () => setRiskDraft(""))}
            onRemove={(i) => setRisks(arr => arr.filter((_, idx) => idx !== i))}
            stacked
          />

          {/* Free notes */}
          <section className="space-y-2">
            <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Notes</Label>
            <Textarea
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Free-form context, background, observations…"
            />
          </section>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={addNote.isPending || !canSave}>
              {addNote.isPending ? "Saving…" : "Save Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChipList({
  icon, label, placeholder, items, draft, setDraft, onAdd, onRemove, stacked,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  items: string[];
  draft: string;
  setDraft: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  stacked?: boolean;
}) {
  return (
    <section className="space-y-2">
      <Label className="flex items-center gap-1.5">{icon}{label}</Label>
      {stacked ? (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm rounded-md border bg-secondary/40 px-2.5 py-1.5">
              <span className="flex-1">{it}</span>
              <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {it}
              <button onClick={() => onRemove(i)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>Add</Button>
      </div>
    </section>
  );
}
