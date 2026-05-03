import { useState } from "react";
import {
  useListReferrals,
  useCreateReferral,
  useConvertReferral,
  useListCustomers,
  getListReferralsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Share2, Copy, CheckCircle, Gift, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Referrals() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ referrerId: "", referredName: "", referredPhone: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: referrals, isLoading } = useListReferrals();
  const { data: customers } = useListCustomers();
  const createReferral = useCreateReferral();
  const convertReferral = useConvertReferral();

  const total = referrals?.length ?? 0;
  const converted = (referrals ?? []).filter((r: any) => r.isConverted).length;
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const rewards = (referrals ?? []).filter((r: any) => r.rewardGiven).length;

  const handleCreate = () => {
    if (!form.referrerId || !form.referredName || !form.referredPhone) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    createReferral.mutate(
      { data: { referrerId: parseInt(form.referrerId), referredName: form.referredName, referredPhone: form.referredPhone } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReferralsQueryKey() });
          setOpen(false);
          setForm({ referrerId: "", referredName: "", referredPhone: "" });
          toast({ title: "Referral created!" });
        },
        onError: () => toast({ title: "Error creating referral", variant: "destructive" }),
      }
    );
  };

  const handleConvert = (code: string) => {
    convertReferral.mutate(
      { code },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReferralsQueryKey() });
          toast({ title: "Referral converted! Reward given.", });
        },
        onError: () => toast({ title: "Could not convert referral", variant: "destructive" }),
      }
    );
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Referral code copied!" });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Share2 className="h-8 w-8 text-primary" /> Referral Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Grow your customer base through word-of-mouth.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Referral</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Create Referral</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Who's Referring? *</Label>
                <Select value={form.referrerId} onValueChange={(v) => setForm({ ...form, referrerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Referred Person's Name *</Label>
                  <Input placeholder="e.g. Pooja Singh" value={form.referredName} onChange={(e) => setForm({ ...form, referredName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Their Phone *</Label>
                  <Input placeholder="9876543210" value={form.referredPhone} onChange={(e) => setForm({ ...form, referredPhone: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createReferral.isPending}>
                {createReferral.isPending ? "Creating..." : "Create Referral"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Referrals", value: isLoading ? null : String(total), icon: Users, color: "bg-blue-500/20 text-blue-400" },
          { label: "Converted", value: isLoading ? null : String(converted), icon: CheckCircle, color: "bg-green-500/20 text-green-400" },
          { label: "Conversion Rate", value: isLoading ? null : `${convRate}%`, icon: TrendingUp, color: "bg-primary/20 text-primary" },
          { label: "Rewards Given", value: isLoading ? null : String(rewards), icon: Gift, color: "bg-amber-500/20 text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-muted-foreground text-xs">{label}</p>
                {value === null ? <Skeleton className="h-7 w-12 mt-0.5" /> : <p className="text-2xl font-bold text-foreground">{value}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referrals Table */}
      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">All Referrals</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : (referrals ?? []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Share2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No referrals yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(referrals ?? []).map((r: any) => (
                <div key={r.id} className="p-4 flex flex-wrap items-center gap-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Referrer</p>
                      <p className="font-medium text-foreground text-sm truncate">{r.referrerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Referred</p>
                      <p className="font-medium text-foreground text-sm truncate">{r.referredName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Code</p>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-primary">{r.referralCode}</span>
                        <button onClick={() => copyCode(r.referralCode)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.isConverted ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1"><CheckCircle className="h-3 w-3" /> Converted</Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Pending</Badge>
                      )}
                      {r.rewardGiven && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs gap-1"><Gift className="h-3 w-3" /> Rewarded</Badge>}
                    </div>
                  </div>
                  {!r.isConverted && (
                    <Button size="sm" variant="outline" onClick={() => handleConvert(r.referralCode)} disabled={convertReferral.isPending}>
                      Mark Converted
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
