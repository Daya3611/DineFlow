"use client";

import { useState, useEffect } from "react";
import { AppSheet } from "@/components/common/AppSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db } from "@/firebase";
import { collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { Plus, Edit2, Package, Tag, AlertTriangle, AlertCircle, CheckCircle2, X } from "lucide-react";
import { PlanDocument } from "@/types";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanDocument | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<PlanDocument>>({
    name: "",
    id: "",
    priceMonthly: 0,
    priceYearly: 0,
    setupFee: 0,
    order: 0,
    tableLimit: 10,
    menuLimit: 999999,
    supportType: "standard",
    analytics: "basic",
    multiOutlet: false,
    isPopular: false,
    isActive: true,
  });

  const [featuresList, setFeaturesList] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "plans"));
      const fetched = snap.docs.map((doc) => doc.data() as PlanDocument);
      setPlans(fetched.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) {
      toast.error("Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  };

  const openSheet = (plan?: PlanDocument) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
      setFeaturesList(plan.features || []);
    } else {
      setEditingPlan(null);
      setFormData({
        name: "",
        id: "",
        priceMonthly: 0,
        priceYearly: 0,
        setupFee: 0,
        order: plans.length > 0 ? Math.max(...plans.map(p => p.order || 0)) + 1 : 1,
        tableLimit: 10,
        menuLimit: 999999,
        supportType: "standard",
        analytics: "basic",
        multiOutlet: false,
        isPopular: false,
        isActive: true,
      });
      setFeaturesList([]);
    }
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.id) {
      toast.error("Name and ID are required.");
      return;
    }
    // Lifetime plan might not have monthly
    if (formData.id !== "trial" && formData.id !== "lifetime") {
        if ((formData.priceMonthly || 0) <= 0 || (formData.priceYearly || 0) <= 0) {
        toast.error("Price must be greater than 0.");
        return;
        }
    }
    if ((formData.setupFee || 0) < 0) {
      toast.error("Setup fee must be >= 0.");
      return;
    }

    try {
      setSaving(true);

      const features = featuresList.map((s) => s.trim()).filter(Boolean);

      const planData: PlanDocument = {
        ...(formData as PlanDocument),
        features,
        createdAt: editingPlan ? editingPlan.createdAt : Date.now(),
      };

      await setDoc(doc(db, "plans", planData.id), planData);

      toast.success(
        editingPlan ? "Plan updated successfully!" : "Plan added successfully!"
      );
      setSheetOpen(false);
      fetchPlans();
    } catch (error) {
      toast.error("Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (plan: PlanDocument, checked: boolean) => {
    if (!checked) {
      const confirmed = window.confirm(
        `Are you sure you want to disable ${plan.name}? It will no longer be available for new subscriptions. Existing users are not affected.`
      );
      if (!confirmed) return;
    }
    try {
      await updateDoc(doc(db, "plans", plan.id), { isActive: checked });
      setPlans(
        plans.map((p) => (p.id === plan.id ? { ...p, isActive: checked } : p))
      );
      toast.success(`Plan ${checked ? "enabled" : "disabled"} successfully.`);
    } catch (err) {
      toast.error("Failed to toggle plan status.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-600" />
            Subscription Plans
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage pricing plans available to restaurants. Changes only affect new subscriptions.
          </p>
        </div>
        <Button
          onClick={() => openSheet()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Plan
        </Button>
      </div>

      <Card className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[200px]">Plan Name</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Tables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No plans found. Please add a plan to get started.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id} className={!plan.isActive ? "bg-slate-50/50 opacity-80" : ""}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 flex items-center gap-2">
                          {plan.name}
                          {plan.isPopular && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-1.5 py-0">Popular</Badge>
                          )}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{plan.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="font-medium text-slate-700">₹{plan.priceMonthly}/mo</span>
                        <span className="text-slate-500">₹{plan.priceYearly}/yr</span>
                        <span className="text-xs text-slate-400 mt-0.5">Setup: ₹{plan.setupFee}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{plan.tableLimit}</TableCell>
                    <TableCell>
                      {plan.isActive ? (
                         <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 shrink-0 gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
                      ) : (
                         <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 shrink-0 gap-1"><AlertCircle className="h-3 w-3" /> Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="flex items-center gap-2 mr-2">
                          <Label className="text-xs text-slate-500 hidden sm:inline-block cursor-pointer" htmlFor={`status-${plan.id}`}>
                            {plan.isActive ? 'Disable' : 'Enable'}
                          </Label>
                          <Switch
                            id={`status-${plan.id}`}
                            checked={plan.isActive}
                            onCheckedChange={(checked) => handleToggleStatus(plan, checked)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSheet(plan)}
                          className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AppSheet
        title={editingPlan ? "Edit Plan" : "Add New Plan"}
        description={editingPlan ? "Changes only apply to new user subscriptions. Existing active subscriptions are unaffected." : "Create a new tier for restaurants."}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editingPlan ? "Save Changes" : "Create Plan"}
      >
        <div className="space-y-6 pb-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800">
             <AlertCircle className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
             <div className="text-sm text-blue-700/90 leading-relaxed font-medium">
               Any modifications securely preserve active subscriptions. If making a critical plan change, consider disabling this one and creating a new plan variant.
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label className="uppercase text-xs font-bold text-slate-500 tracking-wider">Plan Name *</Label>
              <Input
                required
                placeholder="e.g. Pro Plan"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="uppercase text-xs font-bold text-slate-500 tracking-wider">Plan ID (Slug) *</Label>
              <Input
                required
                disabled={!!editingPlan}
                placeholder="e.g. pro-plan-2026"
                value={formData.id || ""}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="h-11 rounded-xl font-mono text-sm"
              />
              <p className="text-[10px] text-slate-400">Used strictly internally. Cannot be changed later.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Monthly (₹) *</Label>
              <Input
                required
                type="number"
                min="0"
                value={formData.priceMonthly || ""}
                onChange={(e) => setFormData({ ...formData, priceMonthly: Number(e.target.value) })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Yearly (₹) *</Label>
              <Input
                required
                type="number"
                min="0"
                value={formData.priceYearly || ""}
                onChange={(e) => setFormData({ ...formData, priceYearly: Number(e.target.value) })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <Label className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Setup Fee (₹) *</Label>
              <Input
                required
                type="number"
                min="0"
                value={formData.setupFee || ""}
                onChange={(e) => setFormData({ ...formData, setupFee: Number(e.target.value) })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
             <div className="space-y-1.5 flex flex-col">
               <Label className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Order *</Label>
               <Input
                 required
                 type="number"
                 min="0"
                 value={formData.order || 0}
                 onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                 className="h-11 rounded-xl"
               />
               <p className="text-[10px] text-slate-400">Lower numbers appear first.</p>
             </div>
             <div className="space-y-1.5 flex flex-col">
               <Label className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Table Limit *</Label>
               <Input
                 required
                 type="number"
                 min="1"
                 value={formData.tableLimit || ""}
                 onChange={(e) => setFormData({ ...formData, tableLimit: Number(e.target.value) })}
                 className="h-11 rounded-xl"
               />
             </div>
          </div>

          <div className="space-y-1.5 flex flex-col pt-1">
             <div className="flex items-center justify-between">
                <div>
                   <Label className="uppercase text-xs font-bold text-slate-700 tracking-wider">Highlight as Popular?</Label>
                   <p className="text-xs text-slate-400 font-medium">Adds a badge and darker styling on the pricing page.</p>
                </div>
                <Switch
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
                />
             </div>
          </div>

          <div className="space-y-2 flex flex-col pt-2">
            <Label className="uppercase text-xs font-bold text-slate-500 tracking-wider">Features List</Label>
            {featuresList.map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                 <Input
                   value={feature}
                   onChange={(e) => {
                     const newFeatures = [...featuresList];
                     newFeatures[i] = e.target.value;
                     setFeaturesList(newFeatures);
                   }}
                   className="h-11 rounded-xl"
                   placeholder="e.g. Advanced analytics"
                 />
                 <Button
                   type="button"
                   variant="ghost"
                   className="h-11 w-11 px-0 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                   onClick={() => {
                     setFeaturesList(featuresList.filter((_, index) => index !== i));
                   }}
                 >
                   <X className="h-5 w-5" />
                 </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setFeaturesList([...featuresList, ""])}
              className="mt-2 h-11 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </div>
        </div>
      </AppSheet>
    </div>
  );
}
