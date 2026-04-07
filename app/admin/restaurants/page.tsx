"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/firebase";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { Restaurant, Subscription, User } from "@/types";
import { toast } from "@/lib/toast";
import { format } from "date-fns";
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Search,
} from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Plan metadata ───────────────────────────────────────────────────────────
const PLANS = [
  { value: "none",     label: "No Plan",          color: "bg-slate-100 text-slate-600" },
  { value: "trial",    label: "Trial · ₹49/7d",   color: "bg-violet-100 text-violet-700" },
  { value: "basic",    label: "Basic",             color: "bg-blue-100 text-blue-700" },
  { value: "pro",      label: "Pro",               color: "bg-emerald-100 text-emerald-700" },
  { value: "premium",  label: "Premium",           color: "bg-amber-100 text-amber-700" },
  { value: "lifetime", label: "Lifetime",          color: "bg-pink-100 text-pink-700" },
];

const STATUS_OPTIONS = [
  { value: "active",    label: "Active",    icon: CheckCircle2,   color: "text-emerald-600" },
  { value: "inactive",  label: "Inactive",  icon: ShieldOff,      color: "text-slate-500" },
  { value: "expired",   label: "Expired",   icon: Clock,          color: "text-red-500" },
  { value: "cancelled", label: "Cancelled", icon: AlertTriangle,  color: "text-orange-500" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPlanMeta(value: string) {
  return PLANS.find(p => p.value === value) ?? PLANS[0];
}

function daysFromNow(ts: number) {
  return Math.ceil((ts - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── DatePicker ──────────────────────────────────────────────────────────────
function DatePicker({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? format(value, "dd MMM yyyy") : "Pick a date"}
        </span>
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 rounded-xl border bg-background shadow-xl">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => { onChange(d); setOpen(false); }}
            initialFocus
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants]           = useState<Restaurant[]>([]);
  const [filtered, setFiltered]                 = useState<Restaurant[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [search, setSearch]                     = useState("");

  // Modal state
  const [selected, setSelected]                 = useState<Restaurant | null>(null);
  const [ownerInfo, setOwnerInfo]               = useState<User | null>(null);
  const [selectedSub, setSelectedSub]           = useState<Subscription | null>(null);
  const [detailsLoading, setDetailsLoading]     = useState(false);

  // Form state
  const [editPlan, setEditPlan]                 = useState("basic");
  const [editStatus, setEditStatus]             = useState("active");
  const [editExpiry, setEditExpiry]             = useState<Date | undefined>(undefined);
  const [saving, setSaving]                     = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => { fetchRestaurants(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? restaurants.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.plan ?? "").toLowerCase().includes(q)
      ) : restaurants
    );
  }, [search, restaurants]);

  const fetchRestaurants = async () => {
    try {
      const snap = await getDocs(collection(db, "restaurants"));
      const data: Restaurant[] = [];
      snap.forEach(d => data.push(d.data() as Restaurant));
      setRestaurants(data);
      setFiltered(data);
    } catch {
      toast.error("Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  // ── Open modal ────────────────────────────────────────────────────────────
  const openDetails = async (restaurant: Restaurant) => {
    setSelected(restaurant);
    setDetailsLoading(true);
    try {
      const userSnap = await getDoc(doc(db, "users", restaurant.ownerId));
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        setOwnerInfo(userData);
        if (userData.subscriptionId) {
          const subSnap = await getDoc(doc(db, "subscriptions", userData.subscriptionId));
          if (subSnap.exists()) {
            const sub = subSnap.data() as Subscription;
            setSelectedSub(sub);
            setEditPlan(sub.plan || restaurant.plan || "none");
            setEditStatus(sub.status || restaurant.subscriptionStatus || "inactive");
            setEditExpiry(sub.expiryDate ? new Date(sub.expiryDate) : undefined);
            return;
          }
        }
      }
      // Fallback to restaurant data
      setEditPlan(restaurant.plan || "none");
      setEditStatus(restaurant.subscriptionStatus || "inactive");
      setEditExpiry(undefined);
      setSelectedSub(null);
    } catch {
      toast.error("Failed to load details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setSelectedSub(null);
    setOwnerInfo(null);
  };

  // ── Date helpers ──────────────────────────────────────────────────────────
  const addDays = (days: number) => {
    const base = editExpiry ?? new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + days);
    setEditExpiry(next);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selected) return;
    if (editExpiry && editExpiry < new Date()) {
      toast.error("Expiry date cannot be in the past");
      return;
    }
    setSaving(true);
    try {
      const expiryTs = editExpiry ? editExpiry.getTime() : 0;

      if (selectedSub && ownerInfo?.subscriptionId) {
        await updateDoc(doc(db, "subscriptions", selectedSub.id), {
          plan: editPlan,
          status: editStatus,
          expiryDate: expiryTs,
        });
      }
      await updateDoc(doc(db, "restaurants", selected.id), {
        plan: editPlan,
        subscriptionStatus: editStatus,
      });

      setRestaurants(prev =>
        prev.map(r =>
          r.id === selected.id
            ? { ...r, plan: editPlan as any, subscriptionStatus: editStatus as any }
            : r
        )
      );
      toast.success("Subscription updated successfully");
      closeModal();
    } catch {
      toast.error("Failed to update subscription");
    } finally {
      setSaving(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const daysLeft = editExpiry ? daysFromNow(editExpiry.getTime()) : 0;
  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3;
  const planMeta = getPlanMeta(editPlan);
  const statusMeta = STATUS_OPTIONS.find(s => s.value === editStatus) ?? STATUS_OPTIONS[0];
  const StatusIcon = statusMeta.icon;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Page ── */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Restaurants</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage subscriptions for all registered restaurants</p>
          </div>
          <Badge variant="secondary" className="w-fit font-semibold">
            {restaurants.length} total
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or plan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
          />
        </div>

        {/* Table/Cards */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No restaurants found.</div>
        ) : (
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <div className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const plan = getPlanMeta(r.plan || "none");
                const isActive = r.subscriptionStatus === "active";
                return (
                  <div
                    key={r.id}
                    onClick={() => openDetails(r)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 cursor-pointer transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="shrink-0">
                      {r.logo ? (
                        <img src={r.logo} alt={r.name} className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm" />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{r.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{r.ownerId}</p>
                    </div>

                    {/* Plan badge */}
                    <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${plan.color}`}>
                      {plan.label}
                    </span>

                    {/* Status dot */}
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className="text-xs text-slate-500 font-medium capitalize hidden sm:inline">
                        {r.subscriptionStatus || "none"}
                      </span>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* ── Modal ── */}
      <Dialog open={!!selected} onOpenChange={open => !open && closeModal()}>
        <DialogContent
          showCloseButton
          className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl gap-0"
        >
          {detailsLoading ? (
            <div className="flex justify-center items-center h-72">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
            </div>
          ) : selected && (
            <>
              {/* ── Header ── */}
              <div className="bg-gradient-to-br from-slate-50 to-white px-6 pt-6 pb-5 border-b border-slate-100">
                <DialogHeader className="gap-0">
                  <div className="flex items-center gap-4 mb-3">
                    {/* Avatar */}
                    <div className="shrink-0 relative">
                      {selected.logo ? (
                        <img
                          src={selected.logo}
                          alt={selected.name}
                          className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white shadow-md"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl font-black shadow-md">
                          {selected.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Status dot */}
                      <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${editStatus === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-lg font-bold text-slate-900 truncate">
                        {selected.name}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-400 mt-0.5 truncate">
                        {ownerInfo?.email || "No email on record"}
                      </DialogDescription>
                    </div>
                  </div>

                  {/* Status Cards */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {/* Status card */}
                    <Card className={`border-0 shadow-none ${editStatus === "active" ? "bg-emerald-50" : "bg-slate-50"}`}>
                      <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Status</p>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${statusMeta.color}`} />
                          <span className="text-sm font-bold text-slate-800 capitalize">{editStatus}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Days Left card */}
                    <Card className={`border-0 shadow-none ${isExpiringSoon ? "bg-red-50" : daysLeft > 3 ? "bg-emerald-50" : "bg-slate-50"}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Days Left</p>
                          {isExpiringSoon && (
                            <Badge className="text-[9px] py-0 px-1.5 bg-red-500 text-white border-0 font-bold">
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                        <p className={`text-xl font-black leading-none ${isExpiringSoon ? "text-red-600" : daysLeft > 3 ? "text-emerald-600" : "text-slate-500"}`}>
                          {daysLeft < 0 ? 0 : daysLeft}
                          <span className="text-sm font-semibold ml-1">days</span>
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </DialogHeader>
              </div>

              {/* ── Controls ── */}
              <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[50vh]">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                    Subscription Controls
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Plan */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Plan</Label>
                      <Select value={editPlan} onValueChange={v => v && setEditPlan(v)}>
                        <SelectTrigger className="h-10 rounded-lg text-sm">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLANS.map(p => (
                            <SelectItem key={p.value} value={p.value}>
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${p.color.split(" ")[0]}`} />
                                {p.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Status</Label>
                      <Select value={editStatus} onValueChange={v => v && setEditStatus(v)}>
                        <SelectTrigger className="h-10 rounded-lg text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>
                              <div className="flex items-center gap-2">
                                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                                {s.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-600">Expiry Date</Label>
                    {selectedSub?.startDate && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Started {format(new Date(selectedSub.startDate), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                  <DatePicker value={editExpiry} onChange={setEditExpiry} />

                  {/* Quick actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <p className="text-xs text-slate-400 font-medium mr-1">Quick add:</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs font-bold rounded-lg"
                      onClick={() => addDays(7)}
                    >
                      +7 Days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs font-bold rounded-lg"
                      onClick={() => addDays(30)}
                    >
                      +30 Days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs font-bold rounded-lg"
                      onClick={() => addDays(365)}
                    >
                      +1 Year
                    </Button>
                  </div>
                </div>

                {/* Plan summary chip */}
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${planMeta.color} text-xs font-semibold`}>
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Currently on <strong>{planMeta.label}</strong> · {daysLeft < 0 ? "Expired" : `${Math.max(0, daysLeft)} days remaining`}
                  </span>
                </div>
              </div>

              {/* ── Footer ── */}
              <DialogFooter className="-mx-0 rounded-b-2xl">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-sm shadow-emerald-500/20 rounded-xl"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : "Save Changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
