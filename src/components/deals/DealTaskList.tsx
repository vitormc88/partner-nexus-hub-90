import { useDealTasksEnhanced, useUpdateDealTask, useDeleteDealTask, DealTask } from "@/hooks/useDealTasksCRUD";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Pencil, AlertTriangle } from "lucide-react";
import { format, isPast, isToday, parseISO, addBusinessDays } from "date-fns";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { AddDealTaskDialog } from "./AddDealTaskDialog";
import { EditDealTaskDialog } from "./EditDealTaskDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEffectivePermissions } from "@/hooks/useRoleTemplates";
import { canEdit } from "@/lib/permissions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Props {
  dealId: string;
  dealCompanyName: string;
  linkedPartnerId: string | null;
  /** Optional: hide the "no follow-up" banner from inside the tab if it's shown elsewhere */
  hideOrphanBanner?: boolean;
  /** Stage of the parent deal (for Won/Lost suppression) */
  dealStage?: string;
  /** Default assignee for follow-ups (lead owner / current user id) */
  defaultAssigneeId?: string | null;
}

const statusStyle = (s: string) => {
  switch (s) {
    case "To Do": return "bg-muted text-muted-foreground";
    case "In Progress": return "bg-info/10 text-info-foreground border-info/20";
    case "Done": return "bg-success/10 text-success-foreground border-success/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const priorityStyle = (p: string) => {
  switch (p) {
    case "High": return "bg-destructive/10 text-destructive border-destructive/20";
    case "Medium": return "bg-warning/10 text-warning-foreground border-warning/20";
    case "Low": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const dueDateColor = (date: string | null) => {
  if (!date) return "";
  const d = parseISO(date);
  if (isPast(d) && !isToday(d)) return "text-destructive font-medium";
  if (isToday(d)) return "text-warning font-medium";
  return "text-muted-foreground";
};

function suggestedFollowUpDate() {
  try {
    return format(addBusinessDays(new Date(), 3), "yyyy-MM-dd");
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }
}

export function DealTaskList({
  dealId,
  dealCompanyName,
  linkedPartnerId,
  hideOrphanBanner = false,
  dealStage,
  defaultAssigneeId = null,
}: Props) {
  const { user, profile } = useAuth();
  const { data: perms } = useMyEffectivePermissions();
  const canEditPipeline = canEdit(perms, "pipeline");

  const { data: tasks = [], isLoading } = useDealTasksEnhanced(dealId);
  const updateTask = useUpdateDealTask();
  const deleteTask = useDeleteDealTask();
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<DealTask | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState(false);
  const [addDefaults, setAddDefaults] = useState<{ title?: string; priority?: string; assignedUserId?: string; dueDate?: string } | undefined>(undefined);

  const isClosed = dealStage === "Won" || dealStage === "Lost";

  const sortedTasks = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "Done");
    const done = tasks.filter((t) => t.status === "Done");
    return [...active, ...done];
  }, [tasks]);

  const openTaskCount = useMemo(
    () => tasks.filter((t) => t.status !== "Done").length,
    [tasks]
  );

  const showOrphanBanner = !hideOrphanBanner && !isClosed && !isLoading && openTaskCount === 0;

  const openAddFollowUp = () => {
    setAddDefaults({
      title: "Follow-up",
      priority: "Medium",
      assignedUserId: defaultAssigneeId || user?.id || "",
      dueDate: suggestedFollowUpDate(),
    });
    setShowAdd(true);
  };

  const openAddBlank = () => {
    setAddDefaults(undefined);
    setShowAdd(true);
  };

  const handleToggleDone = (task: DealTask) => {
    if (!canEditPipeline) {
      toast.error("You don't have permission to update tasks");
      return;
    }
    const newStatus = task.status === "Done" ? "To Do" : "Done";
    const willBeLastOpenCompletion =
      newStatus === "Done" && !isClosed && openTaskCount === 1;

    updateTask.mutate(
      {
        id: task.id,
        deal_id: task.deal_id,
        status: newStatus,
        completed_at: newStatus === "Done" ? new Date().toISOString() : null,
        _completedByName: profile?.full_name || profile?.email || user?.email || null,
        _taskTitle: task.title,
      },
      {
        onSuccess: () => {
          toast.success(newStatus === "Done" ? "Task completed" : "Task reopened");
          if (willBeLastOpenCompletion) {
            setFollowUpPrompt(true);
          }
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDelete = (task: DealTask) => {
    if (!canEditPipeline) {
      toast.error("You don't have permission to delete tasks");
      return;
    }
    deleteTask.mutate(
      { id: task.id, dealId: task.deal_id },
      {
        onSuccess: () => toast.success("Task deleted"),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading tasks…</p>;

  return (
    <div className="space-y-4">
      {showOrphanBanner && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-warning/30 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">No upcoming follow-up task scheduled</p>
            <p className="text-xs text-muted-foreground">This lead may become inactive without a planned next action.</p>
          </div>
          {canEditPipeline && (
            <Button size="sm" onClick={openAddFollowUp}>Create Follow-up Task</Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Tasks ({tasks.length})</h3>
        {canEditPipeline && (
          <Button size="sm" onClick={openAddBlank}>
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No tasks yet. Add one to get started.</p>
      ) : (
        <div className="space-y-2">
          {sortedTasks.map((task) => {
            const done = task.status === "Done";
            return (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-lg border bg-card transition-opacity ${done ? "opacity-60" : ""}`}
              >
                <Checkbox
                  checked={done}
                  onCheckedChange={() => handleToggleDone(task)}
                  className="mt-0.5"
                  disabled={!canEditPipeline}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${statusStyle(task.status)}`}>{task.status}</Badge>
                    {!done && (
                      <Badge className={`text-[10px] px-1.5 py-0 ${priorityStyle(task.priority)}`}>{task.priority}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {task.assigned_user && (
                      <span>→ {task.assigned_user.full_name || task.assigned_user.email}</span>
                    )}
                    {!task.assigned_user && task.assigned_to && (
                      <span>→ {task.assigned_to}</span>
                    )}
                    {task.due_date && (
                      <span className={done ? "text-muted-foreground" : dueDateColor(task.due_date)}>
                        Due {format(parseISO(task.due_date), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  )}
                </div>
                {canEditPipeline && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditTask(task)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(task)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddDealTaskDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        dealId={dealId}
        dealCompanyName={dealCompanyName}
        linkedPartnerId={linkedPartnerId}
        defaults={addDefaults}
      />

      {editTask && (
        <EditDealTaskDialog
          open={!!editTask}
          onOpenChange={(v) => { if (!v) setEditTask(null); }}
          task={editTask}
          dealCompanyName={dealCompanyName}
          linkedPartnerId={linkedPartnerId}
        />
      )}

      {/* Post-completion follow-up suggestion */}
      <Dialog open={followUpPrompt} onOpenChange={setFollowUpPrompt}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule next follow-up?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This lead has no other open tasks. Would you like to create a follow-up so it stays active?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpPrompt(false)}>Dismiss</Button>
            <Button
              onClick={() => {
                setFollowUpPrompt(false);
                openAddFollowUp();
              }}
            >
              Create Follow-up Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
