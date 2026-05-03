import { useState } from "react";
import { useGetWinBackCustomers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, IndianRupee, Clock, MessageCircle, SortAsc, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIER_COLORS = {
  vip: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  regular: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  new: "bg-green-500/20 text-green-400 border-green-500/30",
};

export default function WinBack() {
  const [sortBy, setSortBy] = useState<"ltv" | "days">("ltv");
  const { data: customers, isLoading } = useGetWinBackCustomers();
  const { toast } = useToast();

  const totalLTV = (customers ?? []).reduce((s: number, c: any) => s + (c.ltv ?? 0), 0);

  const sorted = [...(customers ?? [])].sort((a: any, b: any) =>
    sortBy === "ltv" ? b.ltv - a.ltv : b.daysSinceVisit - a.daysSinceVisit
  );

  const handleWhatsApp = (c: any) => {
    navigator.clipboard.writeText(`Hi ${c.name.split(" ")[0]}! ${c.suggestedOffer} — OmniStore Salon 💛`);
    toast({ title: "Message copied!", description: "Paste it in WhatsApp to send." });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="h-8 w-8 text-primary" /> Customer Win-Back
          </h1>
          <p className="text-muted-foreground mt-1">Re-engage customers who haven't visited in 30+ days.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setSortBy(sortBy === "ltv" ? "days" : "ltv")}>
          <SortAsc className="h-4 w-4" /> Sort by: {sortBy === "ltv" ? "LTV" : "Days Away"}
        </Button>
      </div>

      {/* Stats Header */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-red-400" /></div>
            <div>
              <p className="text-muted-foreground text-sm">At-Risk Customers</p>
              {isLoading ? <Skeleton className="h-7 w-16 mt-1" /> : <p className="text-3xl font-bold text-foreground">{customers?.length ?? 0}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center"><IndianRupee className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-muted-foreground text-sm">Total LTV at Stake</p>
              {isLoading ? <Skeleton className="h-7 w-24 mt-1" /> : <p className="text-3xl font-bold text-primary">₹{totalLTV.toLocaleString("en-IN")}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center"><Clock className="h-6 w-6 text-amber-400" /></div>
            <div>
              <p className="text-muted-foreground text-sm">Avg Days Away</p>
              {isLoading ? <Skeleton className="h-7 w-16 mt-1" /> : (
                <p className="text-3xl font-bold text-amber-400">
                  {customers && customers.length > 0
                    ? Math.round((customers as any[]).reduce((s: number, c: any) => s + c.daysSinceVisit, 0) / customers.length)
                    : 0}d
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
        ) : sorted.length === 0 ? (
          <div className="col-span-2">
            <Card className="border-border bg-card">
              <CardContent className="py-16 text-center text-muted-foreground">
                <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>All customers are active! No one to win back right now.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          sorted.map((c: any) => (
            <Card key={c.id} className="border-border bg-card hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                      {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                  </div>
                  <Badge className={`text-xs border capitalize ${TIER_COLORS[c.tier as keyof typeof TIER_COLORS] ?? TIER_COLORS.new}`}>{c.tier}</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className={`text-lg font-bold ${c.daysSinceVisit > 60 ? "text-red-400" : "text-amber-400"}`}>{c.daysSinceVisit}d</p>
                    <p className="text-xs text-muted-foreground">Away</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-foreground">₹{c.totalSpend?.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">Spent</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-lg font-bold text-primary">₹{c.ltv?.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">LTV</p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Suggested Offer:</p>
                  <p className="text-sm text-foreground leading-snug">{c.suggestedOffer}</p>
                </div>

                <Button className="w-full gap-2" size="sm" onClick={() => handleWhatsApp(c)}>
                  <MessageCircle className="h-4 w-4" /> Copy WhatsApp Message
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
