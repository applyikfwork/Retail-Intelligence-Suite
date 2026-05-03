import { 
  useGetDashboardSummary, 
  useGetRecentActivity, 
  useGetSalesByHour, 
  useGetSalesByDay 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IndianRupee, Users, MessageSquare, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: hourly, isLoading: loadingHourly } = useGetSalesByHour();
  const { data: daily, isLoading: loadingDaily } = useGetSalesByDay();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">War Room</h1>
          <p className="text-muted-foreground mt-1">Live metrics and intelligence for today.</p>
        </div>
        {summary?.deadZoneAlert && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-md border border-destructive/20 font-medium">
            <AlertTriangle className="h-5 w-5" />
            <span>Dead Zone Alert: {summary.deadZoneAlert}</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today's Revenue"
          value={loadingSummary ? null : `₹${summary?.todayRevenue.toLocaleString()}`}
          icon={IndianRupee}
          trend={summary?.revenueGrowthPercent ? `+${summary.revenueGrowthPercent}% from yesterday` : null}
          trendUp={true}
        />
        <MetricCard
          title="Today's Walk-ins"
          value={loadingSummary ? null : summary?.todayCustomers.toString()}
          icon={Users}
          trend={`${summary?.totalCustomers} total base`}
        />
        <MetricCard
          title="Active Campaigns"
          value={loadingSummary ? null : summary?.activeCampaigns.toString()}
          icon={MessageSquare}
          trend="WhatsApp Bot Running"
        />
        <MetricCard
          title="Loyalty Scans"
          value={loadingSummary ? null : summary?.loyaltyScansToday.toString()}
          icon={ShieldCheck}
          trend="Today's QR Engagements"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-border">
          <CardHeader>
            <CardTitle>Hourly Pulse & Dead Zones</CardTitle>
          </CardHeader>
          <CardContent className="pl-0 h-[300px]">
            {loadingHourly ? (
              <div className="h-full w-full flex items-center justify-center"><Skeleton className="h-[250px] w-full mx-4" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1C1917', border: '1px solid #332d29', borderRadius: '8px' }} 
                  />
                  <Bar 
                    dataKey="revenue" 
                    radius={[4, 4, 0, 0]}
                    fill="currentColor"
                    className="fill-primary"
                    activeBar={{ className: "fill-primary/80" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card border-border">
          <CardHeader>
            <CardTitle>Recent Action</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {activity?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {item.type === 'sale' ? <IndianRupee className="h-4 w-4 text-primary" /> :
                       item.type === 'scan' ? <ShieldCheck className="h-4 w-4 text-primary" /> :
                       item.type === 'campaign' ? <MessageSquare className="h-4 w-4 text-primary" /> :
                       <TrendingUp className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.customerName && <span className="font-semibold text-foreground mr-1">{item.customerName}</span>}
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {item.amount && (
                      <div className="font-medium text-sm">₹{item.amount}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, trendUp }: { title: string, value: string | null, icon: any, trend?: string | null, trendUp?: boolean }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {trend && (
          <p className={`text-xs mt-1 ${trendUp ? 'text-green-500' : 'text-muted-foreground'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}