"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Menu } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";

const menuItemSchema = z.object({
  name: z.string().min(2, "Item name required"),
  price: z.coerce.number().min(1, "Price must be at least 1"),
  category: z.string().min(2, "Category required"),
});

export default function MenuPage() {
  const { restaurant } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof menuItemSchema>>({
    resolver: zodResolver(menuItemSchema) as any,
  });

  useEffect(() => {
    if (restaurant) {
      fetchMenus();
    }
  }, [restaurant]);

  const fetchMenus = async () => {
    try {
      const q = query(collection(db, "menus"), where("restaurantId", "==", restaurant?.id));
      const querySnapshot = await getDocs(q);
      const fetchedMenus: Menu[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMenus.push(doc.data() as Menu);
      });
      setMenus(fetchedMenus);
    } catch (error) {
      toast.error("Failed to load menus");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const onDelete = async (menuId: string) => {
    try {
      if (confirm("Are you sure you want to delete this menu item?")) {
        await deleteDoc(doc(db, "menus", menuId));
        setMenus(menus.filter(m => m.id !== menuId));
        toast.success("Menu item deleted");
      }
    } catch (error) {
      toast.error("Failed to delete menu item");
    }
  };

  const onSubmit = async (values: z.infer<typeof menuItemSchema>) => {
    if (!restaurant) return;
    if (!file) {
      toast.error("Please select an image for the menu item");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload Image
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `menus/${restaurant.id}`);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Image upload failed");
      const { secure_url } = await uploadRes.json();

      // 2. Add to Firestore
      const menuId = `menu_${Date.now()}`;
      const newMenu: Menu = {
        id: menuId,
        restaurantId: restaurant.id,
        name: values.name,
        price: values.price,
        category: values.category,
        image: secure_url,
      };

      await setDoc(doc(db, "menus", menuId), newMenu);
      setMenus([...menus, newMenu]);
      
      toast.success("Menu item added successfully");
      setOpen(false);
      reset();
      setFile(null);
      setPreview(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to add menu item");
    } finally {
      setSubmitting(false);
    }
  };

  if (!restaurant) return <div className="p-8 text-center text-slate-500">Please complete restaurant setup first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Menu Items</h1>
          <p className="text-slate-500 mt-1">Manage your digital menu catalog.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Menu Item</DialogTitle>
              <DialogDescription>
                Create a new digital menu item with image and price.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                    {preview ? (
                      <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="image">Item Image</Label>
                    <Input id="image" type="file" accept="image/*" onChange={handleFileChange} className="mt-1" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input id="name" placeholder="Margherita Pizza" {...register("name")} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹)</Label>
                    <Input id="price" type="number" placeholder="299" {...register("price")} />
                    {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" placeholder="Italian" {...register("category")} />
                    {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : menus.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none py-12 text-center bg-slate-50/50">
          <h3 className="text-lg font-medium text-slate-900 mb-2">No menu items yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Get started by creating your first digital menu item to display to your customers.</p>
          <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" /> Add your first item
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {menus.map((item) => (
            <Card key={item.id} className="overflow-hidden border-none shadow-sm shadow-slate-200 group hover:shadow-md transition-shadow">
              <div className="relative h-48 w-full bg-slate-100">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                <button 
                  onClick={() => onDelete(item.id)}
                  className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  title="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold rounded-md uppercase tracking-wider">
                  {item.category}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 line-clamp-1" title={item.name}>{item.name}</h3>
                  <span className="font-bold text-indigo-600 whitespace-nowrap ml-3">₹{item.price}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
