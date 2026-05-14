import { XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLossDetails(dealId: string | undefined) {
  return useQuery({
    queryKey: ["loss_details", dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data: detail, error } = await supabase
        .from("opportunity_loss_details")
        .select("*")
        .eq("deal_id", dealId!)
        .maybeSingle();
      if (error) throw error;
      if (!detail) return null;
      const { data: reasons } = await supabase
        .from("opportunity_loss_reasons")
        .select("reason")
        .eq("loss_detail_id", detail.id);
      return { ...detail, reasons: reasons?.map(r => r.reason) ?? [] };
    },
  });
}

export function LossBanner({ dealId }: { dealId: string }) {
  const { data } = useLossDetails(dealId);
  if (!data) return null;

  const competitorLabel =
    data.competitor_name === "Other" ? data.competitor_other : data.competitor_name;
  const lostDate = new Date(data.lost_at).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/30 p-4 animate-reveal-up">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
          <XCircle className="h-4.5 w-4.5 text-orange-700 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">Opportunity Lost</h3>
            <span className="text-xs text-muted-foreground">· {lostDate}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Category: </span>
              <span className="font-medium text-foreground">{data.loss_category}</span>
            </div>
            {competitorLabel && (
              <div>
                <span className="text-muted-foreground">Competitor: </span>
                <span className="font-medium text-foreground">{competitorLabel}</span>
              </div>
            )}
          </div>
          {data.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {data.reasons.map((r: string) => (
                <Badge key={r} variant="secondary" className="text-[10px] font-normal">{r}</Badge>
              ))}
            </div>
          )}
          {data.notes && (
            <p className="text-xs text-muted-foreground italic pt-1 border-t border-orange-200/60 dark:border-orange-900/60 mt-2">
              "{data.notes}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
