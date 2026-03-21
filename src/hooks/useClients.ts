import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;

export function useClients(filters?: { partner_id?: string; status?: string }) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async () => {
      let query = supabase.from("clients").select("*").order("commercial_name");
      if (filters?.partner_id) query = query.eq("partner_id", filters.partner_id);
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });
}

export function useClientContacts(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client_contacts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from("client_contacts").select("*").eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useClientLicenses(clientId: string | undefined) {
  return useQuery({
    queryKey: ["licenses", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from("licenses").select("*").eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useClientContracts(clientId: string | undefined) {
  return useQuery({
    queryKey: ["contracts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from("contracts").select("*").eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}
