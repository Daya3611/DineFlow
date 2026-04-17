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
import { Plus, Edit2, CheckCircle2, X } from "lucide-react";

export default function AdminUpdatesPage() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    title: "",
    description: "",
    isActive: true,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "updates"));
      const fetched = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUpdates(fetched.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch (err) {
      toast.error("Failed to fetch updates");
    } finally {
      setLoading(false);
    }
  };

  const openSheet = (updateDoc?: any) => {
    if (updateDoc) {
      setEditingUpdate(updateDoc);
      setFormData(updateDoc);
    } else {
      setEditingUpdate(null);
      setFormData({
        title: "",
        description: "",
        isActive: true,
      });
    }
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error("Title and description are required.");
      return;
    }

    try {
      setSaving(true);
      const docId = editingUpdate?.id || `update_${Date.now()}`;
      
      const updateData = {
        ...formData,
        createdAt: editingUpdate ? editingUpdate.createdAt : Date.now(),
      };

      await setDoc(doc(db, "updates", docId), updateData);

      toast.success(
        editingUpdate ? "Update saved successfully!" : "Update added successfully!"
      );
      setSheetOpen(false);
      fetchUpdates();
    } catch (error) {
      toast.error("Failed to save update.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (updateItem: any, checked: boolean) => {
    try {
      await updateDoc(doc(db, "updates", updateItem.id), { isActive: checked });
      setUpdates(
        updates.map((u) => (u.id === updateItem.id ? { ...u, isActive: checked } : u))
      );
      toast.success(`Update successfully set to ${checked ? "Active" : "Inactive"}.`);
    } catch (err) {
      toast.error("Failed to toggle update status.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f9d6a]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Updates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage release notes and platform updates.
          </p>
        </div>
        <Button onClick={() => openSheet()} className="bg-[#0f9d6a] hover:bg-[#0c7f56]">
          <Plus className="mr-2 h-4 w-4" /> Add Update
        </Button>
      </div>

      <Card className="rounded-xl border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-semibold text-slate-600">Update Title</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[400px]">Description</TableHead>
                <TableHead className="font-semibold text-slate-600">Status</TableHead>
                <TableHead className="font-semibold text-slate-600">Date Posted</TableHead>
                <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No updates found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                updates.map((u) => (
                  <TableRow key={u.id} className="group hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-900">{u.title}</TableCell>
                    <TableCell className="text-sm text-slate-500 truncate max-w-[400px]">
                      {u.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={(checked) => handleToggleStatus(u, checked)}
                          className="data-[state=checked]:bg-[#0f9d6a]"
                        />
                        <Badge
                          className={`font-semibold ${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openSheet(u)}
                        className="text-slate-500 hover:text-[#0f9d6a]"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editingUpdate ? "Edit Update" : "Add Update"}
      >
        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-700 font-semibold">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. New Advanced Analytics features!"
                className="focus-visible:ring-[#0f9d6a]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-700 font-semibold">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details of the update..."
                className="h-32 focus-visible:ring-[#0f9d6a]"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-0.5">
                <Label className="text-slate-700 font-semibold">Active Status</Label>
                <p className="text-xs text-slate-500">
                  Visible to premium users if turned on.
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                className="data-[state=checked]:bg-[#0f9d6a]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 pb-safe">
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#0f9d6a] hover:bg-[#0c7f56]">
              {saving ? "Saving..." : "Save Update"}
            </Button>
          </div>
        </form>
      </AppSheet>
    </div>
  );
}
