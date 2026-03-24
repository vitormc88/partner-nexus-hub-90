import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientAggregates {
  totalContractValue: number;
  renewals30: number;
  overdue: number;
}

export function useClientAggregates() {
  return useQuery({
    queryKey: ["client-aggregates"],
    queryFn: async () => {
      const now = new Date();
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      const nowStr = now.toISOString().split("T")[0];
      const in30Str = in30.toISOString().split("T")[0];

      // Fetch all contracts for value sum and end date analysis
      const { data: contracts, error: cErr } = await supabase
        .from("contracts")
        .select("total_value, contract_end_date");
      if (cErr) throw cErr;

      // Fetch license end dates
      const { data: licenses, error: lErr } = await supabase
        .from("licenses")
        .select("license_end_date, sat_end_date");
      if (lErr) throw lErr;

      let totalContractValue = 0;
      let renewals30 = 0;
      let overdue = 0;

      // Aggregate contract values and count due/overdue
      for (const c of contracts || []) {
        totalContractValue += Number(c.total_value || 0);
        const endDate = c.contract_end_date;
        if (endDate) {
          if (endDate < nowStr) {
            overdue++;
          } else if (endDate <= in30Str) {
            renewals30++;
          }
        }
      }

      // Also count license and SAT end dates
      for (const l of licenses || []) {
        for (const dateField of [l.license_end_date, l.sat_end_date]) {
          if (dateField) {
            if (dateField < nowStr) {
              overdue++;
            } else if (dateField <= in30Str) {
              renewals30++;
            }
          }
        }
      }

      return { totalContractValue, renewals30, overdue } as ClientAggregates;
    },
  });
}
