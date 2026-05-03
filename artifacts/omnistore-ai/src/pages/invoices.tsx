import { useState } from "react";
import {
  useListInvoices,
  useCreateInvoice,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Receipt, QrCode, Printer, Search, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LineItem { name: string; quantity: number; price: number; total: number; }

const SERVICES = ["Hair Cut", "Hair Spa", "Hair Color", "Manicure", "Pedicure", "Facial", "Blowout", "Waxing"];

export default function Invoices() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", discount: "0", taxRate: "0" });
  const [items, setItems] = useState<LineItem[]>([{ name: "", quantity: 1, price: 0, total: 0 }]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: invoices, isLoading } = useListInvoices();
  const createInvoice = useCreateInvoice();

  const filtered = (invoices ?? []).filter(
    (inv: any) => inv.customerName?.toLowerCase().includes(search.toLowerCase()) || inv.invoiceNumber?.includes(search)
  );

  const updateItem = (i: number, field: keyof LineItem, val: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[i] as any)[field] = val;
      updated[i].total = updated[i].quantity * updated[i].price;
      return updated;
    });
  };

  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const discount = parseFloat(form.discount) || 0;
  const taxRate = parseFloat(form.taxRate) || 0;
  const taxAmount = ((subtotal - discount) * taxRate) / 100;
  const total = subtotal - discount + taxAmount;

  const handleCreate = () => {
    if (!form.customerName || !form.customerPhone || items.some((it) => !it.name || it.price <= 0)) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createInvoice.mutate(
      {
        data: {
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          items: items.filter((it) => it.name && it.price > 0),
          discountAmount: discount,
          taxRate,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          setOpen(false);
          setForm({ customerName: "", customerPhone: "", discount: "0", taxRate: "0" });
          setItems([{ name: "", quantity: 1, price: 0, total: 0 }]);
          toast({ title: "Invoice created!" });
        },
        onError: () => toast({ title: "Error creating invoice", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" /> Invoices
          </h1>
          <p className="text-muted-foreground mt-1">Generate bills and track payments.</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Generate Invoice</Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-border w-full sm:max-w-xl overflow-y-auto" side="right">
            <SheetHeader>
              <SheetTitle>New Invoice</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Customer Name *</Label>
                  <Input placeholder="e.g. Priya Sharma" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Phone *</Label>
                  <Input placeholder="9876543210" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button size="sm" variant="outline" onClick={() => setItems([...items, { name: "", quantity: 1, price: 0, total: 0 }])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                  </Button>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      className="flex-1 bg-background border border-border rounded-md px-3 h-9 text-sm text-foreground"
                      value={item.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                    >
                      <option value="">Select service</option>
                      {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Input type="number" className="w-16" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)} />
                    <Input type="number" className="w-24" placeholder="₹ Price" value={item.price || ""} onChange={(e) => updateItem(i, "price", parseFloat(e.target.value) || 0)} />
                    <span className="text-sm font-medium text-primary w-20 text-right">₹{item.total.toLocaleString()}</span>
                    {items.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Discount (₹)</Label>
                  <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-400">-₹{discount.toLocaleString()}</span></div>}
                {taxAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>₹{Math.round(taxAmount).toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
                  <span>Total</span><span className="text-primary">₹{Math.round(total).toLocaleString()}</span>
                </div>
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={createInvoice.isPending}>
                {createInvoice.isPending ? "Generating..." : "Generate Invoice"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by customer or invoice number..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {selectedInvoice && (
        <Card className="border-primary/30 bg-card print:shadow-none">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary">OmniStore Salon</h2>
                <p className="text-muted-foreground text-sm">123 Main Market, Delhi NCR</p>
                <p className="text-muted-foreground text-sm">+91 98765 43210</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{selectedInvoice.invoiceNumber}</p>
                <p className="text-muted-foreground text-sm">{new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN")}</p>
                <Badge className="mt-1 bg-green-500/20 text-green-400 border-green-500/30">{selectedInvoice.status}</Badge>
              </div>
            </div>
            <div className="border-t border-border pt-4 mb-4">
              <p className="font-semibold">{selectedInvoice.customerName}</p>
              <p className="text-muted-foreground text-sm">{selectedInvoice.customerPhone}</p>
            </div>
            <table className="w-full text-sm mb-4">
              <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2">Service</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {(selectedInvoice.items ?? []).map((it: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2">{it.name}</td>
                    <td className="text-center">{it.quantity}</td>
                    <td className="text-right">₹{it.price.toLocaleString()}</td>
                    <td className="text-right font-medium">₹{it.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{selectedInvoice.subtotal?.toLocaleString()}</span></div>
                {selectedInvoice.discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-400">-₹{selectedInvoice.discountAmount?.toLocaleString()}</span></div>}
                {selectedInvoice.taxAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{selectedInvoice.taxAmount?.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold border-t border-border pt-1 text-base"><span>Total</span><span className="text-primary">₹{selectedInvoice.total?.toLocaleString()}</span></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : filtered.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No invoices found.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((inv: any) => (
            <Card key={inv.id} className="border-border bg-card hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <IndianRupee className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{inv.customerName}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoiceNumber} · {new Date(inv.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hidden sm:flex">{inv.status}</Badge>
                  <span className="font-bold text-primary text-lg">₹{inv.total?.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
