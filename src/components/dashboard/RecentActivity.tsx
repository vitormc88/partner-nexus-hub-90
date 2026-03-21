import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export function RecentActivity() {
  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("published_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const typeVariant: Record<string, "default" | "info" | "secondary"> = {
    Product: "default",
    Event: "info",
    Resource: "secondary",
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm animate-reveal-up stagger-4">
      <div className="p-5 border-b">
        <h3 className="font-semibold text-foreground">Recent Announcements</h3>
      </div>
      <div className="divide-y">
        {announcements.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">No announcements yet</div>
        ) : announcements.map((a) => (
          <div key={a.id} className="px-5 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.published_at ? new Date(a.published_at).toLocaleDateString() : ""}</p>
            </div>
            <Badge variant={typeVariant[a.category || ""] || "secondary"}>{a.category}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
