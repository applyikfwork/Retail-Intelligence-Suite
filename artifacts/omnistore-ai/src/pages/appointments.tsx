import { useState } from "react";
import {
  useListAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useListStaff,
  getListAppointmentsQueryKey,
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
import { Plus, Calendar, Clock, User, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfToday } from "date-fns";

const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  no_show: { label: "No Show", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
} as const;

const SERVICES = ["Hair Cut", "Hair Spa", "Hair Color", "Manicure", "Pedicure", "Facial", "Blowout", "Waxing", "Other"];
const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 9}:00`);

export default function Appointments() {
  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerName: "", staffId: "", service: "", date: format(today, "yyyy-MM-dd"), time: "10:00", duration: "60" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: appointments, isLoading } = useListAppointments({ date: dateStr });
  const { data: staff } = useListStaff();
  const createAppt = useCreateAppointment();
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();

  const todayAppts = appointments?.filter((a) => a.status === "scheduled") ?? [];
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const handleCreate = () => {
    const scheduledAt = new Date(`${form.date}T${form.time.padStart(5, "0")}:00`);
    createAppt.mutate(
      {
        data: {
          customerId: null,
          staffId: form.staffId ? parseInt(form.staffId) : null,
          service: form.service,
          notes: form.customerName || null,
          scheduledAt: scheduledAt.toISOString(),
          durationMinutes: parseInt(form.duration),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          setOpen(false);
          toast({ title: "Appointment booked!" });
        },
        onError: () => toast({ title: "Error", description: "Could not book appointment", variant: "destructive" }),
      }
    );
  };

  const handleStatus = (id: number, status: string) => {
    updateAppt.mutate(
      { id, data: { status: status as "scheduled" | "completed" | "cancelled" | "no_show" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          toast({ title: "Status updated" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteAppt.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
          toast({ title: "Appointment removed" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" /> Appointments
          </h1>
          <p className="text-muted-foreground mt-1">Schedule and manage all client bookings.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Appointment</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Customer Name</Label>
                <Input placeholder="e.g. Priya Sharma" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Service</Label>
                <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>{SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Staff Member</Label>
                <Select value={form.staffId} onValueChange={(v) => setForm({ ...form, staffId: v })}>
                  <SelectTrigger><SelectValue placeholder="Any staff" /></SelectTrigger>
                  <SelectContent>{staff?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name} — {s.role}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Time</Label>
                  <Select value={form.time} onValueChange={(v) => setForm({ ...form, time: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Duration (minutes)</Label>
                <Select value={form.duration} onValueChange={(v) => setForm({ ...form, duration: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["30","45","60","90","120"].map((d) => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!form.service || createAppt.isPending}>
                {createAppt.isPending ? "Booking..." : "Book Appointment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {week.map((day) => {
          const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`flex flex-col items-center px-4 py-2 rounded-lg border transition-colors min-w-[64px] ${isSelected ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
            >
              <span className="text-xs font-medium">{format(day, "EEE")}</span>
              <span className={`text-xl font-bold ${isToday && !isSelected ? "text-primary" : ""}`}>{format(day, "d")}</span>
              <span className="text-xs">{format(day, "MMM")}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Appointments */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> {format(selectedDate, "EEEE, MMMM d")}
          </h2>
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
          ) : appointments && appointments.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No appointments for this day.</p>
                <p className="text-sm mt-1">Click "New Appointment" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            appointments?.map((appt) => {
              const config = STATUS_CONFIG[appt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.scheduled;
              return (
                <Card key={appt.id} className="border-border bg-card hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{appt.notes || "Walk-in"}</span>
                          <Badge className={`text-xs border ${config.color}`}>{config.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(appt.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="font-medium text-primary">{appt.service}</span>
                          {appt.staffName && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {appt.staffName}</span>}
                          <span>{appt.durationMinutes} min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {appt.status === "scheduled" && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400 hover:text-green-300" onClick={() => handleStatus(appt.id, "completed")}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => handleStatus(appt.id, "cancelled")}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(appt.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Today's Summary Sidebar */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today's Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Upcoming", count: todayAppts.filter((a) => a.status === "scheduled").length, color: "text-amber-400" },
                { label: "Completed", count: (appointments ?? []).filter((a) => a.status === "completed").length, color: "text-green-400" },
                { label: "Cancelled", count: (appointments ?? []).filter((a) => a.status === "cancelled").length, color: "text-red-400" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={`text-2xl font-bold ${color}`}>{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {todayAppts.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-400">⚡ Upcoming</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayAppts.slice(0, 5).map((a) => (
                  <div key={a.id} className="text-sm flex justify-between items-center">
                    <span className="text-foreground truncate">{a.notes || "Walk-in"}</span>
                    <span className="text-muted-foreground text-xs ml-2">{new Date(a.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
