import { useGetRevenueForecast } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, IndianRupee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: "text-green-400", label: "Trending Up", bg: "bg-green-500/20 border-green-500/30" },
  down: { icon: TrendingDown, color: "text-red-400", label: "Trending Down", bg: "bg-red-500/20 border-red-500/30" },
  stable: { icon: Minus, color: "text-amber-400", label: "Stable", bg: "bg-amber-500/20 border-amber-500/30" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-sm">
      <p className="font-bold text-foreground mb-1">{label}</p>
      <p className="text-primary font-semibold">₹{payload[0]?.value?.toLocaleString("en-IN")}</p>
      <p className="text-muted-foreground text-xs mt-1">Range: ₹{d?.lowerBound?.toLocaleString()} – ₹{d?.upperBound?.toLocaleString()}</p>
      {d?.isDeadZoneRisk && <p className="text-amber-400 text-xs mt-1">⚠️ Dead zone risk</p>}
    </div>
  );
};

export default function Forecast() {
  const { data: forecast, isLoading } = useGetRevenueForecast();
  const trend = forecast?.trend as keyof typeof TREND_CONFIG | undefined;
  const TrendIcon = trend ? TREND_CONFIG[trend].icon : Minus;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" /> Revenue Forecast
        </h1>
        <p className="text-muted-foreground mt-1">AI-powered 7-day prediction based on your sales history.</p>
      </div>

      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <IndianRupee className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Week Forecast</p>
              {isLoading ? <Skeleton className="h-8 w-28 mt-1" /> : (
                <p className="text-3xl font-bold text-primary">₹{forecast?.weekTotal?.toLocaleString("en-IN")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${trend ? TREND_CONFIG[trend].bg : "bg-muted"}`}>
              <TrendIcon className={`h-6 w-6 ${trend ? TREND_CONFIG[trend].color : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Trend</p>
              {isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : (
                <p className={`text-2xl font-bold capitalize ${trend ? TREND_CONFIG[trend].color : ""}`}>
                  {forecast?.trend ?? "—"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Confidence</p>
              {isLoading ? <Skeleton className="h-7 w-20 mt-1" /> : (
                <p className="text-2xl font-bold text-blue-400">{forecast?.confidenceLevel}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insight Banner */}
      {!isLoading && forecast?.insight && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-start">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">{forecast.insight}</p>
        </div>
      )}

      {/* Bar Chart */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">7-Day Revenue Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={forecast?.days ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis dataKey="dayName" tick={{ fill: "#888", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="predictedRevenue" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {(forecast?.days ?? []).map((d: any, i: number) => (
                    <Cell key={i} fill={d.isDeadZoneRisk ? "#f59e0b" : "#f97316"} fillOpacity={d.isDeadZoneRisk ? 0.7 : 0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-orange-500 inline-block" /> Normal day</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400 inline-block" /> Dead zone risk</span>
          </div>
        </CardContent>
      </Card>

      {/* Day Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {isLoading ? (
          Array(7).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : (
          (forecast?.days ?? []).map((d: any, i: number) => (
            <Card key={i} className={`border-border bg-card ${d.isDeadZoneRisk ? "border-amber-500/30" : ""}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{d.dayName?.slice(0, 3)}</p>
                  {d.isDeadZoneRisk && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                </div>
                <p className="text-xs text-muted-foreground">{new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                <p className="text-lg font-bold text-primary">₹{d.predictedRevenue?.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">₹{d.lowerBound?.toLocaleString()} – ₹{d.upperBound?.toLocaleString()}</p>
                {d.suggestedAction && (
                  <p className="text-xs text-amber-400 leading-tight border-t border-amber-500/20 pt-1 mt-1">{d.suggestedAction}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
