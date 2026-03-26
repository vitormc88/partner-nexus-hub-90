import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHQUsers() {
  return useQuery({
    queryKey: ["hq-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("is_hq", true)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });
}
