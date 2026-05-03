import { useState } from "react";
import {
  useListInventory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, AlertTriangle, Scissors, ShoppingBag, Plus as PlusIcon, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function Inventory() {
  const [open, setOpen] = useState(false);
  const [isService, setIsService] = useState(true);
  const [form, setForm] = useState({ name: "", category: "", price: "", costPrice: "", stock: "0", lowStockThreshold: "5", description: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items, isLoading } = useListInventory();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const services = (items ?? []).filter((i: any) => i.isService && i.isActive);
  const products = (items ?? []).filter((i: any) => !i.isService && i.isActive);
  const lowStockItems = products.filter((i: any) => i.isLowStock);

  const handleCreate = () => {
    if (!form.name || !form.price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    createItem.mutate(
      {
        data: {
          name: form.name,
          category: form.category || (isService ? "Service" : "Product"),
          price: parseFloat(form.price),
          costPrice: parseFloat(form.costPrice) || 0,
          stock: parseInt(form.stock) || 0,
          lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
          isService,
          description: form.description || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
          setOpen(false);
          setForm({ name: "", category: "", price: "", costPrice: "", stock: "0", lowStockThreshold: "5", description: "" });
          toast({ title: "Item added!" });
        },
        onError: () => toast({ title: "Error adding item", variant: "destructive" }),
      }
    );
  };

  const adjustStock = (id: number, delta: number, current: number) => {
    const newStock = Math.max(0, current + delta);
    updateItem.mutate(
      { id, data: { stock: newStock } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() }) }
    );
  };

  const renderCard = (item: any) => (
    <Card key={item.id} className="border-border bg-card hover:border-primary/30 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.category}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-primary text-lg">₹{item.price?.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">Cost: ₹{item.costPrice?.toLocaleString("en-IN")}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">{item.margin}% margin</Badge>
        </div>

        {item.description && <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>}

        {!item.isService && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stock</span>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => adjustStock(item.id, -1, item.stock)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className={`font-bold w-8 text-center ${item.isLowStock ? "text-red-400" : "text-foreground"}`}>{item.stock}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => adjustStock(item.id, 1, item.stock)}>
                  <PlusIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Progress value={Math.min(100, (item.stock / (item.lowStockThreshold + 10)) * 100)} className={`h-1.5 ${item.isLowStock ? "[&>div]:bg-red-400" : "[&>div]:bg-green-400"}`} />
            {item.isLowStock && (
              <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Low stock — reorder needed</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" /> Inventory & Catalog
          </h1>
          <p className="text-muted-foreground mt-1">Manage services, products and stock levels.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Button variant={isService ? "default" : "outline"} size="sm" onClick={() => setIsService(true)} className="flex-1 gap-2"><Scissors className="h-4 w-4" /> Service</Button>
                <Button variant={!isService ? "default" : "outline"} size="sm" onClick={() => setIsService(false)} className="flex-1 gap-2"><ShoppingBag className="h-4 w-4" /> Product</Button>
              </div>
              <div className="space-y-1"><Label>Name *</Label><Input placeholder="e.g. Hair Spa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Price (₹) *</Label><Input type="number" placeholder="1200" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-1"><Label>Cost Price (₹)</Label><Input type="number" placeholder="200" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} /></div>
              </div>
              {!isService && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Initial Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Low Stock Alert</Label><Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /></div>
                </div>
              )}
              <div className="space-y-1"><Label>Description</Label><Input placeholder="Brief description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={createItem.isPending}>
                {createItem.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="font-semibold text-red-400">Low Stock Alert</p>
            <p className="text-sm text-muted-foreground">{lowStockItems.map((i: any) => i.name).join(", ")} — need restocking</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="services">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="services" className="gap-2"><Scissors className="h-4 w-4" /> Services ({services.length})</TabsTrigger>
          <TabsTrigger value="products" className="gap-2"><ShoppingBag className="h-4 w-4" /> Products ({products.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
          ) : services.length === 0 ? (
            <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground"><Scissors className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No services yet. Add your first service.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{services.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : products.length === 0 ? (
            <Card className="border-border bg-card"><CardContent className="py-12 text-center text-muted-foreground"><ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No products yet. Add your first product.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{products.map(renderCard)}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
