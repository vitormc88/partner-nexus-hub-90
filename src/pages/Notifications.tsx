import { useState } from "react";
import { Bell, Check, AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/hooks/useDeals";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const typeIcons: Record<string, typeof AlertTriangle> = {
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  success: CheckCircle2,
};

const typeColors: Record<string, string> = {
  warning: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
  danger: "text-destructive bg-red-50 dark:bg-red-950/40",
  info: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
  success: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
};

export default function Notifications() {
  const { data: notifications = [], isLoading } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const queryClient = useQueryClient();

  const display = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id);
    if (ids.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-reveal-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="h-9 px-4 rounded-lg border bg-card text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors active:scale-[0.97]">
            <Check className="h-4 w-4 inline mr-1.5" />Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 animate-reveal-up stagger-1">
        {(["all", "unread"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-card border text-muted-foreground hover:bg-secondary"}`}>
            {f === "all" ? "All" : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="space-y-2 animate-reveal-up stagger-2">
        {display.length === 0 ? (
          <div className="bg-card rounded-xl border p-12 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications to show</p>
          </div>
        ) : (
          display.map(n => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <div key={n.id} className={`bg-card rounded-xl border shadow-sm p-4 flex gap-3 transition-colors ${!n.is_read ? "border-l-2 border-l-primary" : ""}`}>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${typeColors[n.type] || typeColors.info}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>{n.title}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {n.action_url && (
                      <Link to={n.action_url} className="text-xs font-medium text-primary hover:underline">View details →</Link>
                    )}
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Mark read</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
