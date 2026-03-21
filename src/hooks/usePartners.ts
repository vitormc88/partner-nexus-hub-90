import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Partner = Tables<"partners">;

export function usePartners(filters?: { status?: string; country?: string }) {
  return useQuery({
    queryKey: ["partners", filters],
    queryFn: async () => {
      let query = supabase.from("partners").select("*").order("company_name");
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.country) query = query.eq("country", filters.country);
      const { data, error } = await query;
      if (error) throw error;
      return data as Partner[];
    },
  });
}

export function usePartner(id: string | undefined) {
  return useQuery({
    queryKey: ["partner", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Partner;
    },
    enabled: !!id,
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partner: TablesInsert<"partners">) => {
      const { data, error } = await supabase.from("partners").insert(partner).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Partner>) => {
      const { data, error } = await supabase.from("partners").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}
