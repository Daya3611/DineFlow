"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Plus, Trash2, Edit2, UtensilsCrossed, ImageIcon, Search } from "lucide-react";
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
  const [editingItem, setEditingItem] = useState<Menu | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const onDelete = async (menuId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const handleCloseModal = () => {
    setOpen(false);
    setTimeout(() => {
      setEditingItem(null);
      reset({ name: "", price: undefined, category: "" });
      setImageUrl("");
    }, 200);
  };

  const handleEditClick = (item: Menu, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    setImageUrl(item.image || "");
    reset({
      name: item.name,
      price: item.price,
      category: item.category,
    });
    setOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof menuItemSchema>) => {
    if (!restaurant) return;
    if (!imageUrl) {
      toast.error("Please upload an image for the menu item");
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        const updatedMenu: Menu = {
          ...editingItem,
          name: values.name,
          price: values.price,
          category: values.category,
          image: imageUrl,
        };
        await setDoc(doc(db, "menus", editingItem.id), updatedMenu);
        setMenus(menus.map(m => m.id === editingItem.id ? updatedMenu : m));
        toast.success("Menu item updated successfully");
      } else {
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
      }

      handleCloseModal();
    } catch (error: any) {
      toast.error(error.message || "Failed to save menu item");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMenus = useMemo(() => {
    if (!searchQuery.trim()) return menus;
    const query = searchQuery.toLowerCase();
    return menus.filter(
      (m) => m.name.toLowerCase().includes(query) || (m.category && m.category.toLowerCase().includes(query))
    );
  }, [menus, searchQuery]);

  const groupedMenus = useMemo(() => {
    const groups: { [key: string]: Menu[] } = {};
    filteredMenus.forEach((menu) => {
      const cat = menu.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(menu);
    });
    // Optional: Sort categories alphabetically
    const sortedGroups: { [key: string]: Menu[] } = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });
    return sortedGroups;
  }, [filteredMenus]);

  if (!restaurant) return <div className="p-8 text-center text-gray-500 font-medium pt-20">Please complete restaurant setup first.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Menu Items</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">Manage your digital menu catalog.</p>
        </div>

        <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleCloseModal()}>
          <DialogTrigger render={
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-sm shadow-emerald-200 transition-all hover:scale-[1.02]" />
          }>
            <Plus className="mr-2 h-5 w-5" /> Add Item
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-bold text-xl">{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update details for this digital menu item." : "Create a new digital menu item with image and price."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2 sm:py-4">
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
                  <Input id="name" placeholder="Margherita Pizza" {...register("name")} className="h-11 rounded-xl border-gray-200 focus-visible:ring-emerald-500" />
                  {errors.name && <p className="text-xs font-semibold text-red-500">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="font-semibold text-gray-700">Price (₹)</Label>
                    <Input id="price" type="number" placeholder="299" {...register("price")} className="h-11 rounded-xl border-gray-200 focus-visible:ring-emerald-500" />
                    {errors.price && <p className="text-xs font-semibold text-red-500">{errors.price.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="font-semibold text-gray-700">Category</Label>
                    <Input
                      id="category"
                      placeholder="Italian"
                      list="category-options"
                      {...register("category")}
                      className="h-11 rounded-xl border-gray-200 focus-visible:ring-emerald-500"
                    />
                    <datalist id="category-options">
                      {Array.from(new Set(menus.map(m => m.category))).filter(Boolean).map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                    {errors.category && <p className="text-xs font-semibold text-red-500">{errors.category.message}</p>}
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-4 sm:pt-2">
                <Button type="button" variant="outline" className="rounded-xl font-semibold border-gray-200 text-gray-600 w-full sm:w-auto mb-2 sm:mb-0" onClick={handleCloseModal}>Cancel</Button>
                <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      {menus.length > 0 && (
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search menu items or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 w-full bg-white shadow-sm text-base"
          />
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col gap-3 py-4 w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100 animate-pulse w-full">
              <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 bg-gray-100 rounded-xl shrink-0"></div>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="w-1/2 h-5 bg-gray-100 rounded-lg"></div>
                <div className="w-1/4 h-4 bg-gray-100 rounded-lg"></div>
                <div className="w-16 h-5 bg-gray-100 rounded-lg"></div>
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="w-9 h-9 rounded-full bg-gray-100"></div>
                <div className="w-9 h-9 rounded-full bg-gray-100"></div>
              </div>
            </div>
          ))}
        </div>
      ) : menus.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-dashed border-emerald-100 rounded-[2rem] py-20 sm:py-24 px-4 sm:px-6 text-center shadow-sm"
        >
          <div className="h-20 w-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <UtensilsCrossed className="h-10 w-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">No menu items yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium text-sm sm:text-base">Get started by creating your first delicious item to display to your customers.</p>
          <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 rounded-full shadow-md shadow-emerald-200 transition-all hover:scale-105 hover:-translate-y-0.5">
            <Plus className="mr-2 h-5 w-5" /> Add Your First Item
          </Button>
        </motion.div>
      ) : Object.keys(groupedMenus).length === 0 ? (
        <div className="py-20 text-center bg-white border border-gray-100 rounded-[2rem] shadow-sm">
          <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-5">
            <Search className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500 text-sm">We couldn't find anything matching "{searchQuery}"</p>
          <Button variant="outline" className="mt-6 rounded-xl font-medium" onClick={() => setSearchQuery("")}>Clear Search</Button>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedMenus).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5 min-w-0">

                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-200" />
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate capitalize">
                    {category}
                  </h2>
                </div>
                <span className="inline-flex items-center shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, scale: 0.97 }}
                      transition={{ duration: 0.18, delay: index * 0.03 }}
                      className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px transition-all duration-200 flex items-center gap-4 p-3.5 sm:p-4 group"
                    >
                      {/* Left: Image */}
                      <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-gray-300" />
                        )}
                      </div>

                      {/* Middle: Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base sm:text-[17px] leading-snug line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400 font-medium mt-0.5 truncate">{item.category}</p>
                        <div className="font-extrabold text-emerald-600 text-[15px] sm:text-base mt-1.5">₹{item.price}</div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => handleEditClick(item, e)}
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150 border border-gray-100 shadow-sm hover:border-emerald-200 hover:scale-110"
                          title="Edit item"
                        >
                          <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                          onClick={(e) => onDelete(item.id, e)}
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all duration-150 border border-gray-100 shadow-sm hover:border-red-200 hover:scale-110"
                          title="Delete item"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
