import { useState } from "react";
import { useListSales, useCreateSale, getListSalesQueryKey, useListCustomers } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, CreditCard, Banknote, Smartphone, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Sales() {
  const { data: sales, isLoading } = useListSales();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales POS</h1>
          <p className="text-muted-foreground mt-1">Live transaction feed and quick billing.</p>
        </div>
        <CreateSaleDialog />
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sales?.map((sale, i) => (
                <div key={sale.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {sale.paymentMethod === 'upi' ? <Smartphone className="h-6 w-6 text-primary" /> :
                       sale.paymentMethod === 'card' ? <CreditCard className="h-6 w-6 text-primary" /> :
                       <Banknote className="h-6 w-6 text-primary" />}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{sale.service}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span className="font-medium text-foreground">{sale.customerName || "Walk-in"}</span>
                        <span>•</span>
                        {new Date(sale.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                    <span className="text-xl font-bold">₹{sale.amount.toLocaleString()}</span>
                    <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider">
                      {sale.paymentMethod}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateSaleDialog() {
  const [open, setOpen] = useState(false);
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("upi");
  const [customerId, setCustomerId] = useState<string>("none");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createSale = useCreateSale();
  const { data: customers } = useListCustomers();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !amount) return;
    
    createSale.mutate(
      { 
        data: { 
          service, 
          amount: Number(amount), 
          paymentMethod,
          customerId: customerId === "none" ? null : Number(customerId)
        } 
      },
      {
        onSuccess: () => {
          toast({ title: "Sale Recorded", description: `₹${amount} collected via ${paymentMethod.toUpperCase()}.` });
          queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
          setOpen(false);
          setService(""); setAmount(""); setPaymentMethod("upi"); setCustomerId("none");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to record sale.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 font-bold shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" /> Quick Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record New Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Item / Service Name</label>
            <Input required value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Haircut & Spa" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (₹)</label>
            <Input required type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant={paymentMethod === 'upi' ? 'default' : 'outline'} onClick={() => setPaymentMethod('upi')} className="gap-2"><Smartphone className="h-4 w-4"/> UPI</Button>
              <Button type="button" variant={paymentMethod === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMethod('cash')} className="gap-2"><Banknote className="h-4 w-4"/> Cash</Button>
              <Button type="button" variant={paymentMethod === 'card' ? 'default' : 'outline'} onClick={() => setPaymentMethod('card')} className="gap-2"><CreditCard className="h-4 w-4"/> Card</Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Link to Customer (Optional)</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Walk-in (No Link)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Walk-in (No Link)</SelectItem>
                {customers?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name} - {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createSale.isPending} className="font-bold w-full sm:w-auto">
              {createSale.isPending ? "Processing..." : "Complete Billing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}