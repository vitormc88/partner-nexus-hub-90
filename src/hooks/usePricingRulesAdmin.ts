import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PricingRule } from "@/types/proposal";

/** Update one or more fields on a pricing rule (HQ admin only via RLS). */
export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PricingRule> }) => {
      const { data, error } = await supabase
        .from("pricing_rules")
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PricingRule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing_rules"] });
    },
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<PricingRule>) => {
      const { data, error } = await supabase
        .from("pricing_rules")
        .insert(rule as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PricingRule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing_rules"] }),
  });
}
