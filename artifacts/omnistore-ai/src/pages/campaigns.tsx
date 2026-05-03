import { useState } from "react";
import { useListCampaigns, useCreateCampaign, useGetDeadZones, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Megaphone, AlertTriangle, Send, Users, Percent, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Campaigns() {
  const { data: campaigns, isLoading: loadingCampaigns } = useListCampaigns();
  const { data: deadZones, isLoading: loadingDeadZones } = useGetDeadZones();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Engine</h1>
          <p className="text-muted-foreground mt-1">Automated growth and dead-zone recovery.</p>
        </div>
        <CreateCampaignDialog />
      </div>

      {/* Dead Zone Alerts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" /> 
          AI Dead Zone Alerts
        </h2>
        {loadingDeadZones ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            <Skeleton className="h-40 w-80 shrink-0 rounded-xl" />
            <Skeleton className="h-40 w-80 shrink-0 rounded-xl" />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
            {deadZones?.map((dz, i) => (
              <Card key={i} className="min-w-[320px] snap-center bg-destructive/5 border-destructive/20 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-destructive flex items-center justify-between">
                    {dz.label}
                    <Badge variant="outline" className="text-destructive border-destructive font-bold">{dz.suggestedDiscount}% OFF</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">Historical avg: <span className="font-semibold text-foreground">₹{dz.avgRevenue}</span></p>
                  <p className="text-xs mt-2 text-foreground/80 italic">"Bhaiya, {dz.dayOfWeek} {dz.startHour}:00 is too quiet. Let's blast an offer."</p>
                </CardContent>
                <CardFooter>
                  <CreateCampaignDialog 
                    prefill={{
                      title: `${dz.label} Recovery`,
                      message: `Aapke liye special! 🎉 Flash deal between ${dz.startHour}:00 and ${dz.endHour}:00 this ${dz.dayOfWeek}. Come in and get ${dz.suggestedDiscount}% OFF!`,
                      discountPercent: dz.suggestedDiscount
                    }}
                    trigger={
                      <Button variant="secondary" size="sm" className="w-full font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        Launch Happy Hour
                      </Button>
                    }
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> 
          Active & Past Campaigns
        </h2>
        {loadingCampaigns ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns?.map((camp, i) => (
              <Card key={camp.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{camp.title}</CardTitle>
                    <Badge variant={camp.status === 'sent' ? 'default' : 'secondary'} className="mt-2 uppercase text-[10px] tracking-wider font-bold">
                      {camp.status}
                    </Badge>
                  </div>
                  {camp.discountPercent && (
                    <div className="bg-primary/20 text-primary px-2 py-1 rounded font-bold text-sm">
                      {camp.discountPercent}%
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 bg-muted p-3 rounded-md italic border-l-2 border-primary">
                    {camp.message}
                  </p>
                  <div className="flex gap-6 mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{camp.sentCount}</span> Sent
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-semibold">{camp.responseCount}</span> Conversions
                    </div>
                    <div className="flex items-center gap-2 text-sm ml-auto text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="capitalize">{camp.targetTier}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCampaignDialog({ prefill, trigger }: { prefill?: any, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(prefill?.title || "");
  const [message, setMessage] = useState(prefill?.message || "");
  const [discountPercent, setDiscountPercent] = useState<number | "">(prefill?.discountPercent || "");
  const [targetTier, setTargetTier] = useState<"all" | "vip" | "regular">("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCampaign = useCreateCampaign();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    
    createCampaign.mutate(
      { data: { title, message, discountPercent: discountPercent === "" ? null : Number(discountPercent), targetTier } },
      {
        onSuccess: () => {
          toast({ title: "Campaign Launched", description: "WhatsApp messages are being queued." });
          queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
          setOpen(false);
          if(!prefill) {
            setTitle(""); setMessage(""); setDiscountPercent("");
          }
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to launch campaign.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2 font-bold"><Megaphone className="h-4 w-4" /> New Blast</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create WhatsApp Blast</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Campaign Title (Internal)</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali Special" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Audience</label>
              <Select value={targetTier} onValueChange={(v: any) => setTargetTier(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="vip">VIPs Only</SelectItem>
                  <SelectItem value="regular">Regulars</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Discount % (Optional)</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="number" min="1" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value as any)} className="pl-9" placeholder="e.g. 20" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp Message (Hinglish works best)</label>
            <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} className="h-32 resize-none" placeholder="Aapke liye special deal!..." />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createCampaign.isPending} className="font-bold">
              {createCampaign.isPending ? "Sending..." : "Blast on WhatsApp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}