import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MailPlus, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  to?: string | null;
  contactName?: string | null;
  companyName?: string | null;
}

type TemplateKey = "intro" | "followup" | "retry" | "discovery";

const TEMPLATES: Record<TemplateKey, { label: string; subject: (c: string) => string; body: (n: string, c: string) => string }> = {
  intro: {
    label: "Intro / first touch",
    subject: () => "Quick intro regarding maintenance operations",
    body: (n, c) =>
      `Hi ${n || "there"},\n\nReaching out briefly about how ${c || "your team"} manages maintenance today. If it's a relevant topic, 15 minutes is usually enough to know whether ManWinWin would be a fit.\n\nWould any time this week work?\n\nBest,`,
  },
  followup: {
    label: "Polite follow-up",
    subject: () => "Quick follow-up regarding maintenance operations",
    body: (n, c) =>
      `Hi ${n || "there"},\n\nCircling back on my previous note. Happy to share a couple of quick examples relevant to ${c || "your sector"} if useful.\n\nIs there a better time to connect?\n\nBest,`,
  },
  retry: {
    label: "After unanswered call",
    subject: () => "Following up after my earlier call",
    body: (n) =>
      `Hi ${n || "there"},\n\nTried reaching you by phone earlier — sending a quick note in case email is easier. A few minutes would be enough to understand how you handle maintenance today and whether we can help.\n\nLet me know what works.\n\nBest,`,
  },
  discovery: {
    label: "Discovery call invite",
    subject: () => "Maintenance process discussion",
    body: (n, c) =>
      `Hi ${n || "there"},\n\nFollowing our exchange, I'd like to schedule a short discovery session to map ${c || "your"} current process, main pain points and decision flow. 30 minutes should be enough.\n\nDoes any of these slots work?\n - \n - \n\nBest,`,
  },
};

export function SendEmailDialog({ open, onOpenChange, to, contactName, companyName }: Props) {
  const [template, setTemplate] = useState<TemplateKey>("intro");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const t = TEMPLATES[template];
    setSubject(t.subject(companyName || ""));
    setBody(t.body(contactName || "", companyName || ""));
  }, [template, contactName, companyName, open]);

  const mailtoHref = () => {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    return `mailto:${to || ""}?${params.toString()}`;
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast.success("Email copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send email</DialogTitle>
          <DialogDescription className="text-xs">
            Opens your email client pre-filled. Don't forget to log a contact attempt afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Template</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input className="mt-1" value={to || ""} readOnly />
            </div>
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea className="mt-1 font-mono text-xs" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={copyAll}><Copy className="h-3.5 w-3.5" /> Copy</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button asChild onClick={() => onOpenChange(false)} disabled={!to}>
            <a href={mailtoHref()}><MailPlus className="h-3.5 w-3.5" /> Open in email</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
