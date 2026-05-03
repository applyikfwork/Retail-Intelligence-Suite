import { useState } from "react";
import { useListLoyaltyCards, useRecordLoyaltyScan, getListLoyaltyCardsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { QrCode, Scan, Star, Gift, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Loyalty() {
  const { data: cards, isLoading } = useListLoyaltyCards();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Loyalty Engine</h1>
          <p className="text-muted-foreground mt-1">6 Scans = 1 Free Session. Gamify your retention.</p>
        </div>
        <ScanQRDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)
        ) : (
          cards?.map((card, i) => (
            <Card key={card.id} className={`relative overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 ${card.freeSessionEarned ? 'border-primary shadow-lg shadow-primary/20 ring-1 ring-primary' : 'border-border'}`} style={{ animationDelay: `${i * 50}ms` }}>
              {card.freeSessionEarned && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1 z-10">
                  <Gift className="h-3 w-3" /> REWARD READY
                </div>
              )}
              
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{card.customerName}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center mt-1"><Phone className="h-3 w-3 mr-1" /> {card.phone}</p>
                  </div>
                  <div className="h-12 w-12 bg-white rounded flex items-center justify-center p-1 border border-border/50">
                    {/* Fake QR visual for dashboard using monospace */}
                    <div className="grid grid-cols-4 grid-rows-4 gap-px w-full h-full">
                      {[...Array(16)].map((_, i) => (
                        <div key={i} className={`bg-black ${Math.random() > 0.4 ? 'opacity-100' : 'opacity-0'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-2xl font-bold text-primary">{card.scanCount} <span className="text-sm text-muted-foreground font-normal">/ 6</span></span>
                </div>
                <Progress value={(card.scanCount / 6) * 100} className="h-3" />
                
                <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                  <span className="font-mono bg-muted px-2 py-1 rounded">{card.qrCode}</span>
                  <span>Last: {card.lastScan ? new Date(card.lastScan).toLocaleDateString() : 'Never'}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function ScanQRDialog() {
  const [open, setOpen] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [phone, setPhone] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const recordScan = useRecordLoyaltyScan();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode && !phone) return;
    
    recordScan.mutate(
      { data: { qrCode: qrCode || "MANUAL", phone } },
      {
        onSuccess: (result) => {
          if(result.success) {
            toast({ 
              title: result.freeSessionEarned ? "🎉 REWARD EARNED!" : "Scan Successful", 
              description: result.message,
              variant: result.freeSessionEarned ? "default" : "default"
            });
            queryClient.invalidateQueries({ queryKey: getListLoyaltyCardsQueryKey() });
            setOpen(false);
            setQrCode(""); setPhone("");
          } else {
            toast({ title: "Scan Failed", description: result.message, variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: "Error", description: "Could not record scan.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 font-bold">
          <Scan className="h-5 w-5" /> Record Scan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scan className="h-5 w-5 text-primary" /> Scanner Terminal</DialogTitle>
        </DialogHeader>
        <div className="py-6 flex justify-center border-2 border-dashed border-border rounded-xl bg-muted/30 mb-4">
          <div className="text-center">
            <QrCode className="h-16 w-16 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Scanner Active</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase font-medium">Or enter manually</span>
            <div className="flex-grow border-t border-border"></div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer Phone Number</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
          </div>
          
          <div className="space-y-2 hidden">
            <label className="text-sm font-medium">QR Code String</label>
            <Input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="Read by scanner" />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={recordScan.isPending} className="w-full font-bold text-lg h-12">
              {recordScan.isPending ? "Verifying..." : "Validate & Add Point"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}