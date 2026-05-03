import { useState } from "react";
import {
  useListExpenses,
  useCreateExpense,
  useGetProfitSummary,
  getListExpensesQueryKey,
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
import { Plus, PiggyBank, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";

const CATEGORIES = ["rent", "salaries", "supplies", "utilities", "marketing", "equipment", "other"] as const;

const CAT_COLORS: Record<string, string> = {
  rent: "#ef4444", salaries: "#3b82f6", supplies: "#22c55e", utilities: "#eab308",
  marketing: "#a855f7", equipment: "#f97316", other: "#6b7280",
};

const CAT_LABELS: Record<string, string> = {
  rent: "Rent", salaries: "Salaries", supplies: "Supplies", utilities: "Utilities",
  marketing: "Marketing", equipment: "Equipment", other: "Other",
};

export default function Expenses() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "rent", notes: "", date: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: expenses, isLoading } = useListExpenses();
  const { data: profit, isLoading: loadingProfit } = useGetProfitSummary();
  const createExpense = useCreateExpense();

  const handleCreate = () => {
    if (!form.title || !form.amount) {
      toast({ title: "Title and amount are required", variant: "destructive" });
      return;
    }
    createExpense.mutate(
      { data: { title: form.title, amount: parseFloat(form.amount), category: form.category as any, notes: form.notes || null, date: form.date || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          setOpen(false);
          setForm({ title: "", amount: "", category: "rent", notes: "", date: "" });
          toast({ title: "Expense logged!" });
        },
        onError: () => toast({ title: "Error logging expense", variant: "destructive" }),
      }
    );
  };

  const pieData = (profit?.expenseBreakdown ?? []).filter((e: any) => e.amount > 0).map((e: any) => ({
    name: CAT_LABELS[e.category] || e.category,
    value: e.amount,
    fill: CAT_COLORS[e.category] || "#6b7280",
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PiggyBank className="h-8 w-8 text-primary" /> Expenses & P&L
          </h1>
          <p className="text-muted-foreground mt-1">Track costs and monitor profit margins.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Log Expense</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Log Expense</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input placeholder="e.g. Shop Rent - May" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Amount (₹) *</Label>
                  <Input type="number" placeholder="25000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input placeholder="Optional note" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createExpense.isPending}>
                {createExpense.isPending ? "Saving..." : "Log Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* P&L Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Revenue", value: loadingProfit ? null : `₹${profit?.totalRevenue?.toLocaleString("en-IN")}`, icon: IndianRupee, color: "bg-green-500/20 text-green-400" },
          { label: "Total Expenses", value: loadingProfit ? null : `₹${profit?.totalExpenses?.toLocaleString("en-IN")}`, icon: TrendingDown, color: "bg-red-500/20 text-red-400" },
          { label: "Net Profit", value: loadingProfit ? null : `₹${profit?.grossProfit?.toLocaleString("en-IN")}`, sub: loadingProfit ? null : `${profit?.netProfitMargin}% margin`, icon: TrendingUp, color: "bg-primary/20 text-primary" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}><Icon className="h-6 w-6" /></div>
              <div>
                <p className="text-muted-foreground text-sm">{label}</p>
                {value === null ? <Skeleton className="h-8 w-28 mt-1" /> : <p className="text-2xl font-bold text-foreground">{value}</p>}
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            {loadingProfit ? <Skeleton className="h-52 w-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {pieData.map((d: any) => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full inline-block" style={{ background: d.fill }} />{d.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend Bar Chart */}
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Monthly P&L Trend</CardTitle></CardHeader>
          <CardContent>
            {loadingProfit ? <Skeleton className="h-52 w-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={profit?.monthlyTrend ?? []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#888", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`₹${v.toLocaleString("en-IN")}`, ""]} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">All Expenses</h2>
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : (expenses ?? []).map((e: any) => (
          <Card key={e.id} className="border-border bg-card hover:border-primary/30 transition-colors">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ background: CAT_COLORS[e.category] || "#6b7280" }} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("en-IN")} · <span style={{ color: CAT_COLORS[e.category] }}>{CAT_LABELS[e.category]}</span></p>
                </div>
              </div>
              <span className="font-bold text-red-400 shrink-0">-₹{e.amount?.toLocaleString("en-IN")}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
