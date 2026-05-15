import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useRevenueAndPipelineMonthly, lastUpdatedLabel } from "@/hooks/useAnalytics";

export function RevenueChart() {
  const { data, isLoading, dataUpdatedAt } = useRevenueAndPipelineMonthly();
  const hasData = data.some((d) => d.revenue > 0 || d.pipeline > 0);

  return (
    <div className="bg-card rounded-xl border shadow-sm animate-reveal-up stagger-2">
      <div className="p-5 border-b flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Revenue & Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 12 months · live data</p>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{lastUpdatedLabel(dataUpdatedAt)}</span>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : !hasData ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm font-medium text-foreground">No analytics data available yet</p>
            <p className="text-xs text-muted-foreground mt-1">Data will appear once opportunities are won.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value: number) => [`€${value.toLocaleString()}`, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="revenue" name="Revenue (Won)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pipeline" name="Pipeline (Open)" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
