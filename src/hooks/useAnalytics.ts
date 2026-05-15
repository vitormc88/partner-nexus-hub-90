import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ANALYTICS_STALE_MS = 60_000;

function num(v: any): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

export interface PipelineStageRow {
  stage: string;
  deal_count: number;
  total_value: number;
  weighted_value: number;
}

export function usePipelineStageBreakdown() {
  return useQuery({
    queryKey: ["analytics", "pipeline-stage"],
    staleTime: ANALYTICS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_pipeline_stage" as any).select("*");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        stage: r.stage,
        deal_count: num(r.deal_count),
        total_value: num(r.total_value),
        weighted_value: num(r.weighted_value),
      })) as PipelineStageRow[];
    },
  });
}

export interface OutcomeRow {
  id: string;
  partner_id: string | null;
  status: "Won" | "Lost";
  value: number;
  closed_at: string | null;
}

export function useOutcomes() {
  return useQuery({
    queryKey: ["analytics", "outcomes"],
    staleTime: ANALYTICS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_outcomes" as any).select("*");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        partner_id: r.partner_id,
        status: r.status,
        value: num(r.value),
        closed_at: r.closed_at,
      })) as OutcomeRow[];
    },
  });
}

export interface SalesPerformanceRow {
  sales_key: string;
  user_id: string | null;
  sales_name: string;
  is_unlinked: boolean;
  open_count: number;
  won_count: number;
  lost_count: number;
  won_revenue: number;
  pipeline_value: number;
  weighted_pipeline: number;
  conversion: number;
}

export function useSalesPerformance() {
  return useQuery({
    queryKey: ["analytics", "sales-performance"],
    staleTime: ANALYTICS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_sales_performance" as any).select("*");
      if (error) throw error;
      return (data || [])
        .map((r: any) => {
          const won = num(r.won_count);
          const lost = num(r.lost_count);
          return {
            sales_key: r.sales_key,
            user_id: r.user_id,
            sales_name: r.sales_name,
            is_unlinked: !!r.is_unlinked,
            open_count: num(r.open_count),
            won_count: won,
            lost_count: lost,
            won_revenue: num(r.won_revenue),
            pipeline_value: num(r.pipeline_value),
            weighted_pipeline: num(r.weighted_pipeline),
            conversion: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
          };
        })
        .sort((a, b) => b.won_revenue - a.won_revenue) as SalesPerformanceRow[];
    },
  });
}

export interface PartnerSummaryRow {
  partner_id: string;
  company_name: string;
  country: string | null;
  revenue: number;
  pipeline: number;
  open_deal_count: number;
  won_deal_count: number;
  client_count: number;
}

export function usePartnerAnalytics() {
  return useQuery({
    queryKey: ["analytics", "partner-summary"],
    staleTime: ANALYTICS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_partner_summary" as any).select("*");
      if (error) throw error;
      return (data || [])
        .map((r: any) => ({
          partner_id: r.partner_id,
          company_name: r.company_name,
          country: r.country,
          revenue: num(r.revenue),
          pipeline: num(r.pipeline),
          open_deal_count: num(r.open_deal_count),
          won_deal_count: num(r.won_deal_count),
          client_count: num(r.client_count),
        }))
        .sort((a, b) => b.revenue - a.revenue) as PartnerSummaryRow[];
    },
  });
}

export interface RenewalsSummary {
  total: number;
  won: number;
  lost: number;
  upcoming: number;
  overdue: number;
  won_value: number;
  success_rate: number;
}

export function useRenewalsAnalytics() {
  return useQuery({
    queryKey: ["analytics", "renewals-summary"],
    staleTime: ANALYTICS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_renewals_summary" as any).select("*").maybeSingle();
      if (error) throw error;
      const r: any = data || {};
      return {
        total: num(r.total),
        won: num(r.won),
        lost: num(r.lost),
        upcoming: num(r.upcoming),
        overdue: num(r.overdue),
        won_value: num(r.won_value),
        success_rate: num(r.success_rate),
      } as RenewalsSummary;
    },
  });
}

export interface RevenueByCountryRow {
  country: string;
  revenue: number;
  won_deal_count: number;
}

export function useRevenueByCountry() {
  return useQuery({
    queryKey: ["analytics", "revenue-by-country"],
    staleTime: ANALYTICS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_revenue_by_country" as any).select("*");
      if (error) throw error;
      return (data || [])
        .map((r: any) => ({
          country: r.country,
          revenue: num(r.revenue),
          won_deal_count: num(r.won_deal_count),
        }))
        .sort((a, b) => b.revenue - a.revenue) as RevenueByCountryRow[];
    },
  });
}

export interface MonthlySeriesRow {
  month_key: string;
  month_label: string;
  revenue?: number;
  pipeline_value?: number;
  won_deal_count?: number;
  open_deal_count?: number;
}

export function useRevenueMonthly() {
  return useQuery({
    queryKey: ["analytics", "revenue-monthly"],
    staleTime: ANALYTICS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_revenue_monthly" as any).select("*");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        month_key: r.month_key,
        month_label: r.month_label,
        revenue: num(r.revenue),
        won_deal_count: num(r.won_deal_count),
      })) as MonthlySeriesRow[];
    },
  });
}

export function usePipelineMonthly() {
  return useQuery({
    queryKey: ["analytics", "pipeline-monthly"],
    staleTime: ANALYTICS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_pipeline_monthly" as any).select("*");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        month_key: r.month_key,
        month_label: r.month_label,
        pipeline_value: num(r.pipeline_value),
        open_deal_count: num(r.open_deal_count),
      })) as MonthlySeriesRow[];
    },
  });
}

export function useRevenueAndPipelineMonthly() {
  const rev = useRevenueMonthly();
  const pipe = usePipelineMonthly();
  const map = new Map<string, { month: string; revenue: number; pipeline: number }>();
  (rev.data || []).forEach((r) => {
    map.set(r.month_key, { month: r.month_label, revenue: r.revenue || 0, pipeline: 0 });
  });
  (pipe.data || []).forEach((r) => {
    const e = map.get(r.month_key);
    if (e) e.pipeline = r.pipeline_value || 0;
    else map.set(r.month_key, { month: r.month_label, revenue: 0, pipeline: r.pipeline_value || 0 });
  });
  const data = [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  return {
    data,
    isLoading: rev.isLoading || pipe.isLoading,
    dataUpdatedAt: Math.max(rev.dataUpdatedAt || 0, pipe.dataUpdatedAt || 0),
  };
}

/** Format "Last updated X ago" from React Query's dataUpdatedAt. */
export function lastUpdatedLabel(dataUpdatedAt: number | undefined): string {
  if (!dataUpdatedAt) return "Just now";
  const sec = Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 1000));
  if (sec < 60) return `Last updated ${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `Last updated ${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `Last updated ${hr}h ago`;
  const d = Math.round(hr / 24);
  return `Last updated ${d}d ago`;
}
