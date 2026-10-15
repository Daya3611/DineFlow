"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, addDoc } from "firebase/firestore";
import { Menu } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  UtensilsCrossed,
  ImageIcon,
  Search,
  Edit2,
  Trash2,
  Check,
  MoreVertical,
  Copy,
  Power,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/ui/image-upload";
import { AppSheet } from "@/components/common/AppSheet";
import { getPlanLimits } from "@/lib/plans";
import { UpgradeModal } from "@/components/common/UpgradeModal";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const highlightOptions = [
  { label: "None", value: "none" },
  { label: "Popular", value: "popular" },
  { label: "Chef Special", value: "chef special" },
];
const tags = ["veg", "non-veg", "vegan", "spicy"];

const menuItemSchema = z.object({
  name: z.string().min(2, "Item name required"),
  price: z.coerce.number().min(1, "Price must be at least 1"),
  description: z.string().optional(),
  hasHalfPortion: z.boolean().optional(),
  halfPrice: z.coerce.number().optional(),
  category: z.string().min(2, "Category required"),
  dietaryTags: z.string().optional(),
  highlight: z.string().optional(),
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
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof menuItemSchema>>({
    resolver: zodResolver(menuItemSchema) as any,
    defaultValues: {
      name: "",
      price: undefined,
      description: "",
      hasHalfPortion: false,
      halfPrice: undefined,
      category: "",
      dietaryTags: "veg",
      highlight: "none",
    },
  });
  const selected = watch("dietaryTags") || "veg";
  const selectedHighlight = watch("highlight") || "none";
  const hasHalfPortion = watch("hasHalfPortion") || false;
  const currentLabel =
    highlightOptions.find((opt) => opt.value === selectedHighlight)?.label || "None";

  useEffect(() => {
    if (restaurant) {
      fetchMenus();
    }
  }, [restaurant]);

  const fetchMenus = async () => {
    try {
      const slug = restaurant?.customSlug || restaurant?.id;
      const res = await fetch(`/api/menu/${slug}?page=1&limit=100`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMenus(data);
      } else {
        throw new Error("Failed to fetch");
      }
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
        setMenus(menus.filter((m) => m.id !== menuId));
        toast.success("Menu item deleted");
      } catch (error) {
        toast.error("Failed to delete menu item");
      }
    }
  };

  const onDuplicate = async (item: Menu) => {
    if (!restaurant) return;
    try {
      const newItem = {
        restaurantId: restaurant.id,
        name: `${item.name} (Copy)`,
        price: item.price,
        description: item.description || "",
        category: item.category,
        image: item.image,
        dietaryTags: item.dietaryTags || ["veg"],
        highlight: item.highlight || "none",
        isAvailable: true,
      };
      const docRef = await addDoc(collection(db, "menus"), newItem);
      setMenus([...menus, { ...newItem, id: docRef.id }]);
      toast.success(`Duplicated "${item.name}"`);
    } catch {
      toast.error("Failed to duplicate item");
    }
  };

  const onToggleAvailability = async (item: Menu) => {
    const newStatus = !((item as any).isAvailable !== false);
    try {
      await setDoc(doc(db, "menus", item.id), { isAvailable: newStatus }, { merge: true });
      setMenus(menus.map((m) => (m.id === item.id ? ({ ...m, isAvailable: newStatus } as Menu) : m)));
      toast.success(`Set "${item.name}" to ${newStatus ? "Available" : "Unavailable"}`);
    } catch {
      toast.error("Failed to update availability");
    }
  };

  const handleCloseModal = () => {
    setOpen(false);
    setTimeout(() => {
      setEditingItem(null);
      reset({ name: "", price: undefined, description: "", hasHalfPortion: false, halfPrice: undefined, category: "" });
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
      description: item.description || "",
      hasHalfPortion: item.hasHalfPortion || false,
      halfPrice: item.halfPrice || undefined,
      category: item.category,
      dietaryTags:
        item.dietaryTags && Array.isArray(item.dietaryTags)
          ? item.dietaryTags[0]
          : (item.dietaryTags as any) || "veg",
      highlight: item.highlight || "none",
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
      const hl = (values.highlight as Menu["highlight"]) || "none";
      if (!editingItem) {
        const limitsRes = await fetch("/api/limits/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId: restaurant.id, feature: "menus" }),
        });
        const limitsData = await limitsRes.json();
        if (!limitsRes.ok || limitsData.allowed === false) {
          setShowUpgradeModal(true);
          setSubmitting(false);
          return;
        }

        const menuData: Record<string, any> = {
          restaurantId: restaurant.id,
          name: values.name,
          price: Number(values.price),
          description: values.description || "",
          hasHalfPortion: Boolean(values.hasHalfPortion),
          category: values.category,
          image: imageUrl,
          dietaryTags: values.dietaryTags ? [values.dietaryTags] : ["veg"],
          highlight: hl,
          isAvailable: true,
        };
        if (values.hasHalfPortion && values.halfPrice) {
          menuData.halfPrice = Number(values.halfPrice);
        }

        const docRef = await addDoc(collection(db, "menus"), menuData);
        setMenus([...menus, { ...menuData, id: docRef.id } as Menu]);
        toast.success("Menu item added successfully!");
      } else {
        const updateData: Record<string, any> = {
          name: values.name,
          price: Number(values.price),
          description: values.description || "",
          hasHalfPortion: Boolean(values.hasHalfPortion),
          category: values.category,
          image: imageUrl,
          dietaryTags: values.dietaryTags ? [values.dietaryTags] : ["veg"],
          highlight: hl,
        };
        if (values.hasHalfPortion && values.halfPrice) {
          updateData.halfPrice = Number(values.halfPrice);
        }

        await setDoc(doc(db, "menus", editingItem.id), updateData, { merge: true });
        setMenus(
          menus.map((m) => (m.id === editingItem.id ? ({ ...m, ...updateData } as Menu) : m))
        );
        toast.success("Menu item updated successfully!");
      }
      handleCloseModal();
    } catch (error) {
      toast.error("Failed to save menu item");
    } finally {
      setSubmitting(false);
    }
  };

  // Categories with counts
  const categoryCounts = useMemo(() => {
    const counts: { [cat: string]: number } = {};
    menus.forEach((m) => {
      const cat = m.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [menus]);

  // Filtered menu items
  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      const matchesSearch =
        menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menu.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        activeCategory === "all" ||
        menu.category.toLowerCase() === activeCategory.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [menus, searchQuery, activeCategory]);

  if (!restaurant)
    return (
      <div className="p-8 text-center text-slate-500 font-medium pt-20">
        Please complete restaurant setup first.
      </div>
    );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header matching screenshot EXACTLY */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Menu
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Manage your digital menu catalog
          </p>
        </div>

        <Button
          onClick={() => {
            const limit = getPlanLimits(restaurant?.plan || "basic").menuLimit;
            if (menus.length >= limit) {
              setShowUpgradeModal(true);
            } else {
              setEditingItem(null);
              reset({ name: "", price: undefined, category: "" });
              setImageUrl("");
              setOpen(true);
            }
          }}
          className="h-10 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-xs gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New Item
        </Button>
      </div>

      {/* Full-width Search Bar matching screenshot */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search for items, categories, or variants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-slate-200/90 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#16A34A] shadow-2xs transition-all"
        />
      </div>

      {/* Category Pills Row matching screenshot */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
            activeCategory === "all"
              ? "bg-[#16A34A] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
          }`}
        >
          All Items ({menus.length})
        </button>

        {Object.entries(categoryCounts).map(([cat, count]) => {
          const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-[#16A34A] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Menu Items List - Compact Horizontal Rows matching screenshot EXACTLY */}
      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-3.5 flex items-center justify-between border border-slate-100 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100 shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-100 rounded-md" />
                  <div className="h-3 w-20 bg-slate-100 rounded-md" />
                </div>
              </div>
              <div className="h-4 w-16 bg-slate-100 rounded-md" />
            </div>
          ))}
        </div>
      ) : filteredMenus.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <UtensilsCrossed className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No menu items found</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? `No items match "${searchQuery}"`
              : "Click '+ New Item' to add your first menu item."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {filteredMenus.map((item) => {
              const isVeg =
                item.dietaryTags?.includes("veg") ||
                !item.dietaryTags?.includes("non-veg");
              const isAvailable = (item as any).isAvailable !== false;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
                >
                  {/* Left: Food Image & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-300">
                          <UtensilsCrossed className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Name + Veg/Non-Veg + Category Pill */}
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                          {item.name}
                        </h3>

                        {/* Veg / Non-Veg Tag */}
                        <span
                          className={`h-3.5 w-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                            isVeg ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isVeg ? "bg-green-600" : "bg-red-600"
                            }`}
                          />
                        </span>

                        {/* Category Badge */}
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          {item.category}
                        </span>
                      </div>

                      {/* Availability status line */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold mt-0.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isAvailable ? "bg-[#16A34A]" : "bg-slate-400"
                          }`}
                        />
                        <span className={isAvailable ? "text-[#16A34A]" : "text-slate-400"}>
                          {isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-extrabold text-sm text-slate-900">
                      {item.hasHalfPortion && item.halfPrice ? (
                        <span>
                          ₹{item.halfPrice} <span className="text-slate-400 font-normal">|</span> ₹{item.price}
                        </span>
                      ) : (
                        <span>₹{item.price}</span>
                      )}
                    </div>

                    {/* Three-dot dropdown action menu matching screenshot */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={(props: any) => (
                          <button
                            {...props}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        )}
                      />
                      <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
                        <DropdownMenuItem
                          onClick={(e) => handleEditClick(item, e)}
                          className="text-xs font-bold text-slate-700 flex items-center justify-between cursor-pointer rounded-lg px-3 py-2"
                        >
                          <span>Edit</span>
                          <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => onDuplicate(item)}
                          className="text-xs font-bold text-slate-700 flex items-center justify-between cursor-pointer rounded-lg px-3 py-2"
                        >
                          <span>Duplicate</span>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => onToggleAvailability(item)}
                          className="text-xs font-bold text-slate-700 flex items-center justify-between cursor-pointer rounded-lg px-3 py-2"
                        >
                          <span>Toggle Availability</span>
                          <Power className="h-3.5 w-3.5 text-slate-400" />
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={(e) => onDelete(item.id, e)}
                          className="text-xs font-bold text-red-600 hover:bg-red-50 flex items-center justify-between cursor-pointer rounded-lg px-3 py-2"
                        >
                          <span>Delete</span>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Sheet */}
      <AppSheet
        open={open}
        onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleCloseModal())}
        title={editingItem ? "Edit Menu Item" : "Add New Menu Item"}
        description={
          editingItem
            ? "Update details for this digital menu item."
            : "Create a new digital menu item with image and price."
        }
        onSubmit={handleSubmit(onSubmit)}
        loading={submitting}
        submitLabel={editingItem ? "Save Changes" : "Add Item"}
        className="rounded-l-3xl"
      >
        <div className="flex flex-col gap-2">
          <Label className="font-bold text-slate-700">Item Image</Label>
          <ImageUpload
            value={imageUrl}
            onChange={setImageUrl}
            folder={`restaurants/${restaurant.id}/menu`}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="font-bold text-slate-700">
            Item Name
          </Label>
          <Input
            id="name"
            placeholder="Paneer Butter Masala"
            {...register("name")}
            className="h-11 rounded-xl border-slate-200 focus-visible:ring-[#16A34A]"
          />
          {errors.name && (
            <p className="text-xs font-semibold text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="font-bold text-slate-700">
            Description
          </Label>
          <textarea
            id="description"
            rows={2}
            placeholder="Short description of ingredients, taste, or portion size..."
            {...register("description")}
            className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#16A34A] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price" className="font-bold text-slate-700">
              Full Plate Price (₹)
            </Label>
            <Input
              id="price"
              type="number"
              placeholder="240"
              {...register("price")}
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-[#16A34A]"
            />
            {errors.price && (
              <p className="text-xs font-semibold text-red-500">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category" className="font-bold text-slate-700">
              Category
            </Label>
            <Input
              id="category"
              placeholder="Mains"
              list="category-options"
              {...register("category")}
              className="h-11 rounded-xl border-slate-200 focus-visible:ring-[#16A34A]"
            />
            <datalist id="category-options">
              {Array.from(new Set(menus.map((m) => m.category)))
                .filter(Boolean)
                .map((cat) => (
                  <option key={cat} value={cat} />
                ))}
            </datalist>
            {errors.category && (
              <p className="text-xs font-semibold text-red-500">
                {errors.category.message}
              </p>
            )}
          </div>
        </div>

        {/* Half Portion Enable Switch & Half Price Field */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-extrabold text-slate-900 text-xs block">
                Enable Half Plate Portion
              </Label>
              <p className="text-[11px] text-slate-400 font-medium">
                Allow customers to order a half portion of this dish
              </p>
            </div>
            <input
              type="checkbox"
              id="hasHalfPortion"
              checked={hasHalfPortion}
              onChange={(e) => setValue("hasHalfPortion", e.target.checked)}
              className="h-4 w-4 rounded text-[#16A34A] focus:ring-[#16A34A] border-slate-300"
            />
          </div>

          {hasHalfPortion && (
            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
              <Label htmlFor="halfPrice" className="font-bold text-slate-700 text-xs">
                Half Plate Price (₹)
              </Label>
              <Input
                id="halfPrice"
                type="number"
                placeholder="140"
                {...register("halfPrice")}
                className="h-10 rounded-xl border-slate-200 bg-white focus-visible:ring-[#16A34A]"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="font-bold text-slate-700">Dietary Tags</Label>
          <RadioGroup
            value={selected}
            onValueChange={(value) => setValue("dietaryTags", value)}
            className="flex flex-col gap-2"
          >
            {tags.map((tag) => (
              <Label key={tag} className="flex items-center cursor-pointer select-none">
                <RadioGroupItem value={tag} className="peer" />
                <div
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all duration-200",
                    "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100",
                    "peer-data-checked:bg-[#16A34A] peer-data-checked:text-white peer-data-checked:border-[#16A34A]"
                  )}
                >
                  <span className="text-xs font-bold capitalize">{tag}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </AppSheet>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        featureName="menu items"
        limit={restaurant ? getPlanLimits(restaurant.plan || "basic").menuLimit : 50}
      />
    </div>
  );
}
