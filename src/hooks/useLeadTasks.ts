import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const TASK_STATUSES = ["To Do", "In Progress", "Done"] as const;
export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;

export type LeadTask = {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  assigned_user_id: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  assigned_user?: { full_name: string | null; email: string | null } | null;
};

export function useLeadTasks(leadId: string | undefined) {
  return useQuery({
    queryKey: ["lead-tasks", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*, assigned_user:assigned_user_id(full_name, email)")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LeadTask[];
    },
  });
}

export function useCreateLeadTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: {
      lead_id: string;
      title: string;
      description?: string;
      assigned_user_id?: string | null;
      due_date?: string | null;
      status?: string;
      priority?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from("lead_tasks")
        .insert(task)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lead-tasks", data.lead_id] });
    },
  });
}

export function useUpdateLeadTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      lead_id: string;
      status?: string;
      priority?: string;
      title?: string;
      description?: string;
      assigned_user_id?: string | null;
      due_date?: string | null;
      completed_at?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("lead_tasks")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lead-tasks", data.lead_id] });
    },
  });
}

export function useDeleteLeadTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      const { error } = await supabase.from("lead_tasks").delete().eq("id", id);
      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      qc.invalidateQueries({ queryKey: ["lead-tasks", leadId] });
    },
  });
}
