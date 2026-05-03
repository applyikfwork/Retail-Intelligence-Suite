import { useState } from "react";
import { useListCustomers, useCreateCustomer, getListCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, UserCircle, Phone, Calendar, IndianRupee } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<"all" | "vip" | "regular" | "new">("all");
  const { data: customers, isLoading } = useListCustomers({ search, tier: tier === "all" ? undefined : tier });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your shoppers and track loyalty.</p>
        </div>
        <CreateCustomerDialog />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or phone..." 
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 bg-background p-1 rounded-md border border-border w-full sm:w-auto overflow-x-auto">
          {(['all', 'vip', 'regular', 'new'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-colors capitalize ${tier === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : customers?.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
          <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No customers found</h3>
          <p className="text-muted-foreground">Adjust your filters or add a new customer.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customers?.map((customer, i) => (
            <Card key={customer.id} className="group hover:border-primary/50 transition-colors animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                    <Phone className="h-3 w-3 mr-1" /> {customer.phone}
                  </p>
                </div>
                <Badge variant={customer.tier === 'vip' ? 'default' : customer.tier === 'new' ? 'secondary' : 'outline'} className="capitalize">
                  {customer.tier}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center"><IndianRupee className="h-3 w-3 mr-1" /> Lifetime Spend</p>
                    <p className="font-semibold mt-1">₹{customer.totalSpend.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center"><Calendar className="h-3 w-3 mr-1" /> Last Visit</p>
                    <p className="font-semibold mt-1">{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Visits: {customer.visitCount} | Scans: {customer.loyaltyScanCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCustomer = useCreateCustomer();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    
    createCustomer.mutate(
      { data: { name, phone } },
      {
        onSuccess: () => {
          toast({ title: "Customer added", description: `${name} has been added to the database.` });
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
          setOpen(false);
          setName("");
          setPhone("");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add customer.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}