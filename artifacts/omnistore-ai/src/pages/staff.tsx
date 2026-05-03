import { useState } from "react";
import {
  useListStaff,
  useCreateStaff,
  useGetStaffPerformance,
  getListStaffQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, IndianRupee, TrendingUp, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StaffPerf({ staffId }: { staffId: number }) {
  const { data: perf, isLoading } = useGetStaffPerformance(staffId);
  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl mt-3" />;
  if (!perf) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          { label: "Revenue", value: `₹${perf.totalRevenue?.toLocaleString("en-IN")}`, color: "text-primary" },
          { label: "Commission", value: `₹${perf.commissionEarned?.toLocaleString("en-IN")}`, color: "text-green-400" },
          { label: "Total Sales", value: String(perf.totalSales), color: "text-foreground" },
          { label: "Avg Sale", value: `₹${perf.avgSaleValue?.toLocaleString("en-IN")}`, color: "text-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-muted/50 rounded-lg p-2 text-center">
            <p className={`text-base font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {perf.topService !== "N/A" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          <span>Top service: <span className="text-foreground font-medium">{perf.topService}</span></span>
          {perf.appointmentsCompleted > 0 && <span>· {perf.appointmentsCompleted} appointments</span>}
        </div>
      )}
    </div>
  );
}

export default function Staff() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", role: "Stylist", salary: "", commissionPercent: "10" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staff, isLoading } = useListStaff();
  const createStaff = useCreateStaff();

  const handleCreate = () => {
    if (!form.name || !form.phone) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    createStaff.mutate(
      { data: { name: form.name, phone: form.phone, role: form.role, salary: parseFloat(form.salary) || 0, commissionPercent: parseFloat(form.commissionPercent) || 10 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() });
          setOpen(false);
          setForm({ name: "", phone: "", role: "Stylist", salary: "", commissionPercent: "10" });
          toast({ title: "Staff member added!" });
        },
        onError: () => toast({ title: "Error adding staff", variant: "destructive" }),
      }
    );
  };

  const totalSalary = (staff ?? []).reduce((s: number, m: any) => s + (m.salary ?? 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" /> Staff Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Monitor team performance and commissions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Full Name *</Label>
                  <Input placeholder="e.g. Kavita Sharma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Phone *</Label>
                  <Input placeholder="9811001001" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Input placeholder="e.g. Senior Stylist" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Monthly Salary (₹)</Label>
                  <Input type="number" placeholder="20000" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Commission (%)</Label>
                  <Input type="number" placeholder="10" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createStaff.isPending}>
                {createStaff.isPending ? "Adding..." : "Add Staff Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Header stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Team Size", value: isLoading ? null : String(staff?.length ?? 0), icon: Users, color: "bg-blue-500/20 text-blue-400" },
          { label: "Monthly Payroll", value: isLoading ? null : `₹${totalSalary.toLocaleString("en-IN")}`, icon: IndianRupee, color: "bg-primary/20 text-primary" },
          { label: "Avg Commission", value: isLoading ? null : `${staff && staff.length > 0 ? Math.round((staff as any[]).reduce((s: number, m: any) => s + m.commissionPercent, 0) / staff.length) : 0}%`, icon: TrendingUp, color: "bg-green-500/20 text-green-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}><Icon className="h-6 w-6" /></div>
              <div>
                <p className="text-muted-foreground text-sm">{label}</p>
                {value === null ? <Skeleton className="h-8 w-20 mt-1" /> : <p className="text-3xl font-bold text-foreground">{value}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
        ) : (staff ?? []).map((member: any) => (
          <Card key={member.id} className="border-border bg-card hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                    {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <Badge className={`text-xs border ${member.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Monthly Salary</p>
                  <p className="font-semibold text-foreground">₹{member.salary?.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Commission Rate</p>
                  <p className="font-semibold text-green-400">{member.commissionPercent}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-semibold text-foreground text-xs">{member.phone}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-muted-foreground hover:text-foreground gap-1"
                onClick={() => setExpanded(expanded === member.id ? null : member.id)}
              >
                {expanded === member.id ? <><ChevronUp className="h-4 w-4" /> Hide Stats</> : <><ChevronDown className="h-4 w-4" /> View Performance</>}
              </Button>

              {expanded === member.id && <StaffPerf staffId={member.id} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
