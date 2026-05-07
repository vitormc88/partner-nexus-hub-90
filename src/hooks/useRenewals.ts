import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeRenewalStatus } from "@/lib/lifecycle";

export interface RenewalRow {
  id: string;
  client_id: string;
  license_id: string | null;
  partner_id: string | null;
  renewal_type: string;
  renewal_date: string;
  estimated_value: number | null;
  status: string;
  billing_frequency: string | null;
  notes: string | null;
  priority?: string;
  assigned_owner?: string | null;
}

function priorityFor(days: number) {
  if (days < 0) return "Critical";
  if (days <= 30) return "High";
  if (days <= 90) return "Medium";
  return "Low";
}

export function useRealRenewals() {
  return useQuery({
    queryKey: ["renewals", "real"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewals")
        .select("*")
        .order("renewal_date", { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => {
        const days = r.renewal_date
          ? Math.ceil((new Date(r.renewal_date).getTime() - Date.now()) / 86400000)
          : 0;
        // refresh derived status if record looks stale
        const status =
          r.status && (r.status === "Won" || r.status === "Lost")
            ? r.status
            : computeRenewalStatus(r.renewal_date);
        return { ...r, status, priority: priorityFor(days) } as RenewalRow;
      });
    },
  });
}
