"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Menu } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, UtensilsCrossed, ImageIcon, Search, Edit2, Trash2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/ui/image-upload";
import { AppDropdown } from "@/components/common/AppDropdown";
import { AppSheet } from "@/components/common/AppSheet";
import { getPlanLimits } from "@/lib/plans";
import { UpgradeModal } from "@/components/common/UpgradeModal";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const highlightOptions = [
  { label: "None", value: "none" },
  { label: "Popular", value: "popular" },
  { label: "Chef Special", value: "chef special" },
];
const tags = ["veg", "non-veg", "vegan", "spicy"];

const menuItemSchema = z.object({
  name: z.string().min(2, "Item name required"),
  price: z.coerce.number().min(1, "Price must be at least 1"),
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);



  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<z.infer<typeof menuItemSchema>>({
    resolver: zodResolver(menuItemSchema) as any,
    defaultValues: {
      name: "",
      category: "",
      dietaryTags: "veg",
      highlight: "none"
    }
  });
  const selected = watch("dietaryTags") || "veg";
  const selectedHighlight = watch("highlight") || "none";
  const currentLabel = highlightOptions.find(opt => opt.value === selectedHighlight)?.label || "None";

  useEffect(() => {
    if (restaurant) {
      fetchMenus();
    }
  }, [restaurant]);

  const fetchMenus = async () => {
    try {
      const slug = restaurant?.customSlug || restaurant?.id;
      const res = await fetch(`/api/menu/${slug}?page=1&limit=50`);
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
      dietaryTags: (item.dietaryTags && Array.isArray(item.dietaryTags)) ? item.dietaryTags[0] : (item.dietaryTags as any || "veg"),
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
      if (!editingItem) {
        const limitsRes = await fetch("/api/limits/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId: restaurant.id, feature: "menus" }),
        });
        const limitsData = await limitsRes.json();
        if (!limitsRes.ok || limitsData.allowed === false) {
          if (limitsData.error && limitsData.error.includes("limit reached")) {
            toast.error(limitsData.error);
            setShowUpgradeModal(true);
            handleCloseModal();
            return;
          }
          throw new Error(limitsData.error || "Failed capability check");
        }
      }

      const itemId = editingItem ? editingItem.id : `menu_${Date.now()}`;
      const menuData: Menu = {
        id: itemId,
        restaurantId: restaurant.id,
        name: values.name,
        price: values.price,
        category: values.category || "",
        image: imageUrl || "",
        dietaryTags: values.dietaryTags ? [values.dietaryTags] : [],
        highlight: (values.highlight as any) || "none"
      };

      await setDoc(doc(db, "menus", itemId), menuData);

      if (editingItem) {
        setMenus(menus.map(m => m.id === itemId ? menuData : m));
        toast.success("Menu item updated successfully");
      } else {
        setMenus([...menus, menuData]);
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
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Menu Items</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Manage your digital menu catalog.</p>
        </div>

        <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 h-9 rounded-full text-white" onClick={() => {
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
        >
          <Plus className="mr-2 h-5 w-5" /> Add Item
        </Button>

        {/* Add / Edit Sheet */}
        <AppSheet
          open={open}
          onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleCloseModal()}
          title={editingItem ? "Edit Menu Item" : "Add New Menu Item"}
          description={editingItem ? "Update details for this digital menu item." : "Create a new digital menu item with image and price."}
          onSubmit={handleSubmit(onSubmit)}
          loading={submitting}
          submitLabel={editingItem ? "Save Changes" : "Add Item"}
          className="rounded-l-3xl"
        >
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

          <div className="space-y-1.5">
            <Label className="font-semibold text-gray-700">
              Dietary Tags
            </Label>

            <RadioGroup
              value={selected} // ✅ controlled
              onValueChange={(value) => setValue("dietaryTags", value)}
              className="flex flex-col "
            >
              {tags.map((tag) => (
                <Label
                  key={tag}
                  className="flex items-center cursor-pointer select-none"
                >
                  <RadioGroupItem value={tag} className="peer" />
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-200",
                      "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100",
                      "peer-data-checked:bg-green-500 peer-data-checked:text-white peer-data-checked:border-green-500 peer-data-checked:hover:bg-green-600"
                    )}
                  >
                    <span className="text-sm font-semibold capitalize tracking-tight">{tag}</span>
                    {/* <AnimatePresence>
                      {watch("dietaryTags") === tag && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence> */}
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-gray-700">Highlight</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props: any) => (
                  <Button
                    {...props}
                    variant="outline"
                    className="w-full h-11 justify-between rounded-xl border-gray-200"
                  >
                    {currentLabel}
                  </Button>
                )}
              />

              <DropdownMenuContent className="w-full">
                {highlightOptions.map((item) => (
                  <DropdownMenuItem
                    key={item.value}
                    onClick={() => setValue("highlight", item.value)}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </AppSheet>
      </div>


      {/* Search Bar */}
      {menus.length > 0 && (
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input
            placeholder="Search menu items or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-full border-slate-200 w-full bg-white text-base"
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
          <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-5">
            <UtensilsCrossed className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No menu items yet</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm sm:text-base">Get started by creating your first delicious item to display to your customers.</p>
          <Button onClick={() => setOpen(true)} className="bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30 font-bold h-11 px-6 rounded-full transition-all">
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
          <Button variant="outline" className="mt-6" onClick={() => setSearchQuery("")}>Clear Search</Button>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedMenus).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 mt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                  <h2 className="text-lg sm:text-xl font-medium text-slate-900 tracking-tight capitalize">
                    {category}
                  </h2>
                </div>
                <span className="inline-flex items-center shrink-0 text-slate-500 text-xs sm:text-sm font-medium px-2 py-1">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, scale: 0.97 }}
                      transition={{ duration: 0.18, delay: index * 0.03 }}
                      className="bg-white rounded-[12px] border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 p-4 sm:p-5 group"
                    >
                      {/* Left: Image */}
                      <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-slate-300" />
                        )}
                      </div>

                      {/* Middle: Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 text-base sm:text-lg leading-snug line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">{item.category}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.highlight && item.highlight !== "none" && (
                            <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm shrink-0">
                              *{item.highlight}
                            </span>
                          )}
                          {item.dietaryTags?.map(tag => (
                            <span key={tag} className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm border shrink-0 ${tag === 'veg' ? 'bg-green-50 text-green-700 border-green-200' : tag === 'non-veg' ? 'bg-red-50 text-red-700 border-red-200' : tag === 'vegan' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="font-semibold text-[#059669] text-[15px] sm:text-base mt-1.5">₹{item.price}</div>
                      </div>

                      {/* Right: Actions */}
                      <div className="shrink-0">
                        <AppDropdown
                          items={[
                            {
                              label: "Edit item",
                              icon: Edit2,
                              onClick: (e?: any) => handleEditClick(item, e),
                            },
                            {
                              label: "Delete item",
                              icon: Trash2,
                              danger: true,
                              separator: true,
                              onClick: () => onDelete(item.id),
                            },
                          ]}
                        />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        featureName="menu items"
        limit={restaurant ? getPlanLimits(restaurant.plan || "basic").menuLimit : 50}
      />
    </div>
  );
}
