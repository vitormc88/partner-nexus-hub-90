import { useParams, Link } from "react-router-dom";
import { mockDeals, mockDealContacts, mockDealTasks, mockDealActivities, pipelineStages } from "@/data/deals-mock-data";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, MapPin, User, Calendar, DollarSign, Phone, Mail, CalendarCheck, CheckCircle2, Circle, MessageSquare, Clock } from "lucide-react";

export default function DealDetail() {
  const { id } = useParams();
  const deal = mockDeals.find(d => d.id === id);
  if (!deal) return <div className="p-8 text-center text-muted-foreground">Deal not found</div>;

  const contacts = mockDealContacts.filter(c => c.dealId === id);
  const tasks = mockDealTasks.filter(t => t.dealId === id);
  const activities = mockDealActivities.filter(a => a.dealId === id);
  const stageInfo = pipelineStages.find(s => s.key === deal.stage);

  const activityIcon = (type: string) => {
    if (type === "call") return <Phone className="h-3.5 w-3.5 text-blue-500" />;
    if (type === "email") return <Mail className="h-3.5 w-3.5 text-amber-500" />;
    if (type === "meeting") return <Calendar className="h-3.5 w-3.5 text-emerald-500" />;
    return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 animate-reveal-up">
        <Link to="/pipeline" className="h-8 w-8 rounded-lg border bg-card flex items-center justify-center hover:bg-secondary transition-colors active:scale-95">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground tracking-tight truncate">{deal.companyName}</h1>
            <Badge variant={deal.status === "Won" ? "success" : deal.status === "Lost" ? "destructive" : "outline"}>{deal.stage}</Badge>
            {deal.registrationStatus && (
              <Badge variant={deal.registrationStatus === "Approved" ? "success" : deal.registrationStatus === "Pending" ? "warning" : "destructive"} className="text-[10px]">
                Reg: {deal.registrationStatus}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{deal.partnerName} · {deal.assignedSalesperson}</p>
        </div>
      </div>

      {/* Stage Progress */}
      <div className="bg-card rounded-xl border shadow-sm p-4 animate-reveal-up" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center gap-1">
          {pipelineStages.filter(s => s.key !== "Lost").map((stage, i) => {
            const stageIdx = pipelineStages.findIndex(s => s.key === deal.stage);
            const thisIdx = pipelineStages.findIndex(s => s.key === stage.key);
            const isActive = thisIdx <= stageIdx && deal.stage !== "Lost";
            return (
              <div key={stage.key} className="flex-1 flex items-center gap-1">
                <div className={`h-2 flex-1 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-secondary"}`} />
                {i < pipelineStages.length - 2 && <div className="w-0" />}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {pipelineStages.filter(s => s.key !== "Lost").map(stage => (
            <span key={stage.key} className={`text-[10px] ${deal.stage === stage.key ? "text-primary font-semibold" : "text-muted-foreground"}`}>{stage.label}</span>
          ))}
        </div>
      </div>

      <Tabs defaultValue="overview" className="animate-reveal-up" style={{ animationDelay: "120ms" }}>
        <TabsList className="w-full justify-start bg-secondary/50 rounded-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="communication">Communication ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Deal Information</h3>
              {[
                { icon: DollarSign, label: "Expected Value", value: `€${deal.expectedValue.toLocaleString()}` },
                { icon: DollarSign, label: "Total Value", value: deal.totalValue > 0 ? `€${deal.totalValue.toLocaleString()}` : "—" },
                { icon: Calendar, label: "Expected Close", value: new Date(deal.expectedCloseDate).toLocaleDateString("en-GB") },
                { icon: Building2, label: "Industry", value: deal.industry },
                { icon: MapPin, label: "Country", value: deal.country },
                { icon: User, label: "Lead Source", value: deal.leadSource },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <row.icon className="h-3.5 w-3.5" />
                    <span className="text-xs">{row.label}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-card rounded-xl border shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Pipeline Metrics</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Probability", value: `${deal.probability}%`, color: deal.probability >= 60 ? "text-emerald-600" : "text-foreground" },
                  { label: "Aging", value: `${deal.agingDays} days`, color: deal.agingDays > 45 ? "text-amber-600" : "text-foreground" },
                  { label: "Weighted Value", value: `€${Math.round(deal.expectedValue * deal.probability / 100).toLocaleString()}`, color: "text-foreground" },
                  { label: "Tasks", value: `${deal.taskCount}`, color: "text-foreground" },
                ].map(m => (
                  <div key={m.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                    <p className={`text-lg font-bold tabular-nums ${m.color}`}>{m.value}</p>
                    <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
              {deal.description && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{deal.description}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
              <button className="text-xs text-primary hover:underline">+ Add Task</button>
            </div>
            <div className="divide-y">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                  {task.isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                    <p className="text-[11px] text-muted-foreground">{task.assignedTo} · Due {new Date(task.dueDate).toLocaleDateString("en-GB")}</p>
                  </div>
                  {!task.isCompleted && new Date(task.dueDate) < new Date() && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                </div>
              ))}
              {tasks.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No tasks yet</div>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Contacts</h3>
              <button className="text-xs text-primary hover:underline">+ Add Contact</button>
            </div>
            <div className="divide-y">
              {contacts.map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                      {c.contactName.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{c.contactName}</p>
                        {c.isDecisionMaker && <Badge variant="info" className="text-[10px]">Decision Maker</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{c.role}</p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <p>{c.email}</p>
                    <p>{c.phone}</p>
                  </div>
                </div>
              ))}
              {contacts.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No contacts yet</div>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="communication" className="mt-4">
          <div className="bg-card rounded-xl border shadow-sm p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Activity Timeline</h3>
            <div className="space-y-0">
              {activities.map((a, i) => (
                <div key={a.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      {activityIcon(a.activityType)}
                    </div>
                    {i < activities.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground">{a.subject}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{a.activityType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{a.performedBy} · {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-sm text-foreground/80">{a.description}</p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
