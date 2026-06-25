import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Trash2, Users, Tag, ListChecks, AlertTriangle, MessageSquare, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PartnerNote } from "@/hooks/usePartnerNotes";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function typeStyle(t: string) {
  switch (t) {
    case "Meeting":
    case "Business Review":
    case "Quarterly Review":
      return { dot: "bg-primary", variant: "default" as const };
    case "Phone Call":
    case "Email":
      return { dot: "bg-info", variant: "secondary" as const };
    case "Training":
    case "Partner Visit":
    case "Event":
      return { dot: "bg-success", variant: "secondary" as const };
    case "Internal Discussion":
      return { dot: "bg-muted-foreground", variant: "outline" as const };
    default:
      return { dot: "bg-muted-foreground", variant: "secondary" as const };
  }
}

export function RelationshipTimelineEntry({
  note, onDelete,
}: {
  note: PartnerNote;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { dot, variant } = typeStyle(note.interaction_type);

  const openActions = note.action_items.filter(a => a.status === "Open").length;
  const totalActions = note.action_items.length;

  const hasStructured =
    note.topics.length > 0 ||
    note.decisions.length > 0 ||
    note.action_items.length > 0 ||
    note.risks.length > 0 ||
    note.participants.length > 0;

  const isLegacy = !hasStructured && !!note.content;

  return (
    <div className="relative pl-9">
      <span className={cn("absolute left-2 top-3 h-3 w-3 rounded-full ring-4 ring-background", dot)} />
      <div className="bg-card rounded-xl border shadow-sm">
        {/* Header */}
        <div className="p-4 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={variant} className="text-[10px]">{note.interaction_type}</Badge>
              <span className="text-xs text-muted-foreground tabular-nums">{fmtDateShort(note.interaction_date)}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-medium text-foreground">{note.author_name || "Unknown"}</span>
            </div>

            {/* Summary chips */}
            {hasStructured ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                {note.topics.length > 0 && (
                  <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" />{note.topics.length} {note.topics.length === 1 ? "topic" : "topics"}</span>
                )}
                {note.decisions.length > 0 && (
                  <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />{note.decisions.length} {note.decisions.length === 1 ? "decision" : "decisions"}</span>
                )}
                {totalActions > 0 && (
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                    {openActions} open / {totalActions} {totalActions === 1 ? "action" : "actions"}
                  </span>
                )}
                {note.risks.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="h-3 w-3" />{note.risks.length} {note.risks.length === 1 ? "risk" : "risks"}</span>
                )}
                {note.participants.length > 0 && (
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{note.participants.length}</span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-foreground whitespace-pre-wrap line-clamp-2">{note.content || <span className="text-muted-foreground italic">No content</span>}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {(hasStructured || note.content || note.next_actions) && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(o => !o)}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {open && (
          <div className="border-t px-4 py-3 space-y-4 bg-secondary/20 rounded-b-xl">
            <p className="text-[11px] text-muted-foreground">Logged {fmtDate(note.created_at)}</p>

            {note.participants.length > 0 && (
              <Section icon={<Users className="h-3.5 w-3.5" />} title="Participants">
                <div className="flex flex-wrap gap-1.5">
                  {note.participants.map((p, i) => (
                    <Badge key={i} variant={p.kind === "user" ? "secondary" : "outline"} className="text-[10px]">{p.name}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {note.topics.length > 0 && (
              <Section icon={<Tag className="h-3.5 w-3.5" />} title="Topics discussed">
                <div className="flex flex-wrap gap-1.5">
                  {note.topics.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}
                </div>
              </Section>
            )}

            {note.decisions.length > 0 && (
              <Section icon={<ListChecks className="h-3.5 w-3.5" />} title="Key decisions">
                <ul className="space-y-1 text-sm">
                  {note.decisions.map((d, i) => (
                    <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{d}</span></li>
                  ))}
                </ul>
              </Section>
            )}

            {note.action_items.length > 0 && (
              <Section icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Action items">
                <ul className="space-y-1.5">
                  {note.action_items.map(a => (
                    <li key={a.id} className="flex items-start gap-2 text-sm">
                      {a.status === "Completed"
                        ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        : <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={cn(a.status === "Completed" && "line-through text-muted-foreground")}>{a.description}</p>
                        {(a.owner || a.due_date) && (
                          <p className="text-[11px] text-muted-foreground">
                            {a.owner && <>Owner: {a.owner}</>}
                            {a.owner && a.due_date && " · "}
                            {a.due_date && <>Due {fmtDateShort(a.due_date)}</>}
                          </p>
                        )}
                      </div>
                      <Badge variant={a.status === "Completed" ? "secondary" : "outline"} className="text-[10px]">{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {note.risks.length > 0 && (
              <Section icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />} title="Risks / concerns">
                <ul className="space-y-1 text-sm">
                  {note.risks.map((r, i) => (
                    <li key={i} className="flex gap-2"><span className="text-warning">•</span><span>{r}</span></li>
                  ))}
                </ul>
              </Section>
            )}

            {note.content && (
              <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="Notes">
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              </Section>
            )}

            {note.next_actions && !note.action_items.length && (
              <Section icon={<ListChecks className="h-3.5 w-3.5" />} title="Next actions">
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.next_actions}</p>
              </Section>
            )}

            {isLegacy && (
              <p className="text-[11px] text-muted-foreground italic">Legacy entry — structured fields were not captured at the time.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {icon}{title}
      </p>
      {children}
    </div>
  );
}
