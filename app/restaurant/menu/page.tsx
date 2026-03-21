"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Menu } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/ui/image-upload";

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
  const [imageUrl, setImageUrl] = useState<string>("");

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

  const onDelete = async (menuId: string) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      try {
        await deleteDoc(doc(db, "menus", menuId));
        setMenus(menus.filter(m => m.id !== menuId));
        toast.success("Menu item deleted");
      } catch (error) {
        toast.error("Failed to delete menu item");
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof menuItemSchema>) => {
    if (!restaurant) return;
    if (!imageUrl) {
      toast.error("Please upload an image for the menu item");
      return;
    }

    setSubmitting(true);
    try {
      const menuId = `menu_${Date.now()}`;
      const newMenu: Menu = {
        id: menuId,
        restaurantId: restaurant.id,
        name: values.name,
        price: values.price,
        category: values.category,
        image: imageUrl,
      };

      await setDoc(doc(db, "menus", menuId), newMenu);
      setMenus([...menus, newMenu]);
      
      toast.success("Menu item added successfully");
      setOpen(false);
      reset();
      setImageUrl("");
    } catch (error: any) {
      toast.error(error.message || "Failed to add menu item");
    } finally {
      setSubmitting(false);
    }
  };

  if (!restaurant) return <div className="p-8 text-center text-gray-500 font-medium pt-20">Please complete restaurant setup first.</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Menu Items</h1>
          <p className="text-gray-500 mt-1 font-medium">Manage your digital menu catalog.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-sm shadow-emerald-200 transition-all hover:scale-[1.02]">
              <Plus className="mr-2 h-5 w-5" /> Add Item
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold">Add New Menu Item</DialogTitle>
              <DialogDescription>
                Create a new digital menu item with image and price.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label className="font-semibold text-gray-700">Item Image</Label>
                  <ImageUpload 
                    value={imageUrl}
                    onChange={setImageUrl}
                    folder={`restaurants/${restaurant.id}/menu`}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name" className="font-semibold text-gray-700">Item Name</Label>
                  <Input id="name" placeholder="Margherita Pizza" {...register("name")} className="h-11 rounded-xl border-gray-200" />
                  {errors.name && <p className="text-xs font-semibold text-red-500">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="font-semibold text-gray-700">Price (₹)</Label>
                    <Input id="price" type="number" placeholder="299" {...register("price")} className="h-11 rounded-xl border-gray-200" />
                    {errors.price && <p className="text-xs font-semibold text-red-500">{errors.price.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="font-semibold text-gray-700">Category</Label>
                    <Input id="category" placeholder="Italian" {...register("category")} className="h-11 rounded-xl border-gray-200" />
                    {errors.category && <p className="text-xs font-semibold text-red-500">{errors.category.message}</p>}
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" className="rounded-xl font-semibold border-gray-200 text-gray-600" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-32 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-600/80">Loading your menu...</p>
        </div>
      ) : menus.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-dashed border-emerald-100 rounded-[2rem] py-24 px-6 text-center shadow-sm"
        >
          <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5 shadow-inner">
             <UtensilsCrossed className="h-10 w-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">No menu items yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">Get started by creating your first delicious item to display to your customers.</p>
          <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 rounded-full shadow-md shadow-emerald-200 transition-all hover:scale-105 hover:-translate-y-0.5">
            <Plus className="mr-2 h-5 w-5" /> Add Your First Item
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {menus.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden group flex flex-col transition-all duration-300"
              >
                {/* Top Section: Image & Overlays */}
                <div className="relative h-48 w-full bg-gray-50 shrink-0 overflow-hidden">
                  <motion.img 
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                    src={item.image} 
                    alt={item.name} 
                    className="h-full w-full object-cover" 
                  />
                  
                  {/* Category Badge Overlay */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm">
                    {item.category}
                  </div>

                  {/* Delete Action (visible on hover) */}
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 text-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-red-500 hover:bg-red-50 hover:scale-110 shadow-sm"
                    title="Delete item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Middle & Bottom Section: Details */}
                <div className="p-5 flex flex-col flex-1 bg-white relative z-10">
                  <h3 className="font-extrabold text-gray-900 text-lg line-clamp-1 mb-1" title={item.name}>{item.name}</h3>
                  <p className="text-xs font-medium text-gray-400 mb-4">{item.category} Item</p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-extrabold text-emerald-600 text-[1.35rem]">₹{item.price}</span>
                    <button 
                      onClick={() => toast.info("Edit feature coming soon!")}
                      className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Edit item"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
