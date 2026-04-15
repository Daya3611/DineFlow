"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db, auth } from "@/firebase";
import { doc, setDoc, updateDoc, collection, query, where, getDocs, getDoc, runTransaction } from "firebase/firestore";
import { updatePassword, updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Store,
  MapPin,
  Phone,
  Mail,
  Building2,
  QrCode,
  User as UserIcon,
  Settings,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  IndianRupee,
  Sparkles,
  CheckCircle2,
  Camera,
  Trash2,
  Globe,
  ShoppingBag,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence, type Variants } from "framer-motion";

const restaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name is required"),
  address: z.string().min(5, "Full address is required"),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{10,14}$/, "Valid phone number required (10+ digits)"),
  email: z.string().email("Invalid business email"),
  gstNumber: z.string().optional(),
  upiId: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.includes("@"),
      "Invalid UPI format (e.g., name@bank)"
    ),
  customSlug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed")
    .optional()
    .or(z.literal("")),
});

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 6,
      "Password must be at least 6 characters"
    ),
});

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.32, ease: "easeOut" },
  }),
};

export default function SettingsPage() {
  const { user, userData, restaurant, setRestaurant, setUserData } = useAuth();

  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugAlternatives, setSlugAlternatives] = useState<string[]>([]);

  const [logoUrl, setLogoUrl] = useState<string>(restaurant?.logo || "");
  const [photoUrl, setPhotoUrl] = useState<string>(
    user?.photoURL || userData?.photoUrl || ""
  );

  useEffect(() => {
    if (restaurant?.logo) setLogoUrl(restaurant.logo);
  }, [restaurant?.logo]);

  useEffect(() => {
    if (user?.photoURL) setPhotoUrl(user.photoURL);
    else if (userData?.photoUrl) setPhotoUrl(userData.photoUrl);
  }, [user, userData]);

  const restaurantForm = useForm<z.infer<typeof restaurantSchema>>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: restaurant?.name || "",
      address: restaurant?.address || "",
      phoneNumber: restaurant?.phoneNumber || "",
      email: restaurant?.email || "",
      gstNumber: restaurant?.gstNumber || "",
      upiId: restaurant?.upiId || "",
      customSlug: restaurant?.customSlug || "",
    },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userData?.name || user?.displayName || "",
      password: "",
    },
  });

  useEffect(() => {
    if (restaurant) {
      restaurantForm.reset({
        name: restaurant.name || "",
        address: restaurant.address || "",
        phoneNumber: restaurant.phoneNumber || "",
        email: restaurant.email || "",
        gstNumber: restaurant.gstNumber || "",
        upiId: restaurant.upiId || "",
        customSlug: restaurant.customSlug || "",
      });
    }
  }, [restaurant]);

  useEffect(() => {
    if (userData || user) {
      profileForm.reset({
        name: userData?.name || user?.displayName || "",
        password: "",
      });
    }
  }, [userData, user]);

  const watchedSlug = restaurantForm.watch("customSlug");
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://dineflow.pro";

  useEffect(() => {
    if (!watchedSlug || !restaurant) {
      setSlugStatus("idle");
      setSlugAlternatives([]);
      return;
    }
    if (watchedSlug === restaurant?.customSlug && restaurant?.customSlug !== "") {
      setSlugStatus("available");
      return;
    }
    // Set to idle when user types new slug
    setSlugStatus("idle");
    setSlugAlternatives([]);
  }, [watchedSlug, restaurant]);

  const checkSlug = async () => {
    if (!watchedSlug || watchedSlug === restaurant?.customSlug) return;
    setSlugStatus("checking");
    try {
      let isTaken = false;
      const slugQuery = query(collection(db, 'restaurants'), where('customSlug', '==', watchedSlug));
      const querySnap = await getDocs(slugQuery);
      isTaken = querySnap.docs.some(d => d.id !== restaurant?.id);

      if (!isTaken) {
        const slugDoc = await getDoc(doc(db, 'slugConstraints', watchedSlug));
        isTaken = slugDoc.exists() && slugDoc.data()?.restaurantId !== restaurant?.id;
      }

      if (!isTaken) {
        setSlugStatus("available");
        setSlugAlternatives([]);
      } else {
        setSlugStatus("taken");

        let checkIndex = 1;
        let alternatives = [];
        while (alternatives.length < 3 && checkIndex < 20) {
          const option = `${watchedSlug}-${checkIndex}`;
          const altQuery = query(collection(db, 'restaurants'), where('customSlug', '==', option));
          const altSnap = await getDocs(altQuery);
          let altTaken = altSnap.docs.some(d => d.id !== restaurant?.id);
          if (!altTaken) {
            const altDoc = await getDoc(doc(db, 'slugConstraints', option));
            altTaken = altDoc.exists() && altDoc.data()?.restaurantId !== restaurant?.id;
          }
          if (!altTaken) {
            alternatives.push(option);
          }
          checkIndex++;
        }
        setSlugAlternatives(alternatives);
      }
    } catch (e) {
      setSlugStatus("idle");
    }
  };
  const bookingUrl = `${origin}/@${restaurant?.plan === "premium" && restaurant.customSlug
      ? restaurant.customSlug
      : restaurant?.id || ""
    }/booking`;

  const takeawayUrl = `${origin}/@${restaurant?.plan === "premium" && restaurant.customSlug
      ? restaurant.customSlug
      : restaurant?.id || ""
    }/takeaway`;

  const onRestaurantSubmit = async (
    values: z.infer<typeof restaurantSchema>
  ) => {
    if (!user || !userData) return;
    setRestaurantLoading(true);

    try {
      const restaurantId = restaurant?.id || `rest_${user.uid}`;

      const customSlugToSave = restaurant?.plan === "premium" ? values.customSlug || "" : restaurant?.customSlug || "";
      const updateData = {
        id: restaurantId,
        ownerId: user.uid,
        name: values.name,
        address: values.address,
        phoneNumber: values.phoneNumber,
        email: values.email,
        gstNumber: values.gstNumber || "",
        upiId: values.upiId || "",
        logo: logoUrl,
        subscriptionStatus: restaurant?.subscriptionStatus || "inactive",
        plan: restaurant?.plan || "none",
        customSlug: customSlugToSave,
      };

      await runTransaction(db, async (transaction) => {
        if (customSlugToSave) {
          const slugRef = doc(db, 'slugConstraints', customSlugToSave);
          const docSnap = await transaction.get(slugRef);
          if (docSnap.exists() && docSnap.data()?.restaurantId !== restaurantId) {
            throw new Error('Slug already in use by another restaurant');
          }
        }

        const restRef = doc(db, 'restaurants', restaurantId);
        const currentRestSnap = await transaction.get(restRef);
        const oldSlug = currentRestSnap.data()?.customSlug;

        if (oldSlug && oldSlug !== customSlugToSave) {
          transaction.delete(doc(db, 'slugConstraints', oldSlug));
        }

        if (customSlugToSave) {
          transaction.set(doc(db, 'slugConstraints', customSlugToSave), {
            restaurantId,
            updatedAt: Date.now()
          });
        }

        transaction.set(restRef, updateData, { merge: true });
      });

      if (!restaurant) {
        await updateDoc(doc(db, "users", user.uid), { restaurantId });
        setUserData({ ...userData, restaurantId });
      }

      setRestaurant({ ...(restaurant as any), ...values, customSlug: restaurant?.plan === "premium" ? values.customSlug || "" : restaurant?.customSlug || "", logo: logoUrl });
      restaurantForm.reset(values);
      toast.success("Settings updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save restaurant details.");
    } finally {
      setRestaurantLoading(false);
    }
  };

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user || !auth.currentUser) return;
    setProfileLoading(true);

    try {
      if (values.password) {
        await updatePassword(auth.currentUser, values.password);
      }

      await updateProfile(auth.currentUser, {
        displayName: values.name,
        photoURL: photoUrl,
      });

      await updateDoc(doc(db, "users", user.uid), {
        name: values.name,
        photoUrl: photoUrl,
      });

      setUserData({ ...userData, name: values.name, photoUrl } as any);
      profileForm.reset({ name: values.name, password: "" });
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        toast.error("Please re-login to change password for security reasons.");
      } else {
        toast.error(error.message || "Failed to save profile.");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const isRestaurantDirty =
    restaurantForm.formState.isDirty || logoUrl !== (restaurant?.logo || "");
  const isProfileDirty =
    profileForm.formState.isDirty ||
    photoUrl !== (user?.photoURL || userData?.photoUrl || "");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Page Header ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-gray-500">
              Manage your restaurant profile, billing & booking
            </p>
          </div>
        </div>

        {/* Plan Badge */}
        <div>
          {restaurant?.plan === "premium" ? (
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 px-3 py-1.5 text-xs font-bold shadow-md shadow-amber-200 gap-1">
              <Sparkles className="h-3 w-3" />
              Premium Plan
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-gray-200 text-gray-500 px-3 py-1.5 text-xs font-semibold gap-1"
            >
              <Store className="h-3 w-3" />
              Basic Plan
            </Badge>
          )}
        </div>
      </motion.div>

      {/* ── Tabs ────────────────────────────────── */}
      <Tabs
        defaultValue="general"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="mb-6">
          <TabsList className="h-11 bg-gray-100 rounded-xl p-1 gap-0.5">
            <TabsTrigger
              value="general"
              className="rounded-lg px-5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 transition-all"
            >
              <Store className="h-3.5 w-3.5 mr-1.5" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="rounded-lg px-5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 transition-all"
            >
              <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="booking"
              className="rounded-lg px-5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 transition-all"
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
              Booking
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="rounded-lg px-5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 transition-all"
            >
              <UserIcon className="h-3.5 w-3.5 mr-1.5" />
              Profile
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ════════════════════════════════════════
            TAB: GENERAL
        ════════════════════════════════════════ */}
        <TabsContent value="general" className="m-0 focus-visible:outline-none">
          <form
            onSubmit={restaurantForm.handleSubmit(onRestaurantSubmit)}
            className="focus-visible:outline-none"
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* ── Left: Brand Identity + Contact ── */}
              <div className="lg:col-span-3 space-y-6">
                {/* Brand Identity Card */}
                <motion.div
                  custom={0}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <Camera className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900">
                            Brand Identity
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Your logo and business name shown on the digital menu
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        {/* Logo Upload */}
                        <div className="shrink-0">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2.5">
                            Restaurant Logo
                          </Label>
                          <ImageUpload
                            value={logoUrl}
                            onChange={setLogoUrl}
                            folder={`restaurants/${user?.uid}/logo`}
                            disabled={restaurantLoading}
                          />
                        </div>
                        {/* Business Name */}
                        <div className="flex-1 min-w-0 w-full">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2.5">
                            Business Name *
                          </Label>
                          <Input
                            id="name"
                            placeholder="e.g. Royal Greens Restaurant"
                            className="h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-400 text-gray-900 font-medium transition-all"
                            {...restaurantForm.register("name")}
                          />
                          {restaurantForm.formState.errors.name && (
                            <p className="text-xs text-red-500 font-medium mt-1.5">
                              {restaurantForm.formState.errors.name.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            This name appears on your menu, QR cards, and booking
                            page.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Contact Info Card */}
                <motion.div
                  custom={1}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900">
                            Contact Info
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Used on your digital menu and for customer communication
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      {/* Address */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="address"
                          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          Full Address *
                        </Label>
                        <Textarea
                          id="address"
                          placeholder="123 Green Street, City, State 400001"
                          className="min-h-[90px] rounded-xl border-gray-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-400 resize-none transition-all"
                          {...restaurantForm.register("address")}
                        />
                        {restaurantForm.formState.errors.address && (
                          <p className="text-xs text-red-500 font-medium">
                            {restaurantForm.formState.errors.address.message}
                          </p>
                        )}
                      </div>

                      {/* Phone + Email — 2-col grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="phone"
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            Phone Number *
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="phone"
                              placeholder="9876543210"
                              className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-400 transition-all"
                              {...restaurantForm.register("phoneNumber")}
                            />
                          </div>
                          {restaurantForm.formState.errors.phoneNumber && (
                            <p className="text-xs text-red-500 font-medium">
                              {restaurantForm.formState.errors.phoneNumber.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="email"
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            Business Email *
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="contact@restaurant.com"
                              className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-400 transition-all"
                              {...restaurantForm.register("email")}
                            />
                          </div>
                          {restaurantForm.formState.errors.email && (
                            <p className="text-xs text-red-500 font-medium">
                              {restaurantForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ── Right: Quick tips / preview ── */}
              <div className="lg:col-span-2 space-y-6">
                <motion.div
                  custom={2}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white overflow-hidden">
                    <CardHeader className="px-6 py-4 border-b border-emerald-100">
                      <CardTitle className="text-base font-semibold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Setup Checklist
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                      {[
                        {
                          done: !!restaurant?.logo,
                          label: "Upload restaurant logo",
                        },
                        {
                          done: !!restaurant?.name,
                          label: "Set business name",
                        },
                        {
                          done: !!restaurant?.address,
                          label: "Add restaurant address",
                        },
                        {
                          done: !!restaurant?.phoneNumber,
                          label: "Add phone number",
                        },
                        {
                          done: !!restaurant?.upiId,
                          label: "Connect UPI for payments",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-3"
                        >
                          <div
                            className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all ${item.done
                                ? "bg-emerald-500"
                                : "bg-gray-200"
                              }`}
                          >
                            <CheckCircle2
                              className={`h-3 w-3 ${item.done ? "text-white" : "text-gray-400"
                                }`}
                            />
                          </div>
                          <span
                            className={`text-sm font-medium ${item.done
                                ? "line-through text-gray-400"
                                : "text-gray-700"
                              }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Booking link quick-access */}
                <motion.div
                  custom={3}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-[#0f9d6a]" />
                        Your Booking URL
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 font-mono break-all select-all leading-relaxed">
                        {bookingUrl}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs ga.5" onClick={() => copyToClipboard(bookingUrl)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs ga.5" onClick={() => window.open(bookingUrl, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Takeaway link quick-access */}
                <motion.div
                  custom={4}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden mt-6">
                    <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-[#0f9d6a]" />
                        Your Takeaway URL
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-3">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600 font-mono break-all select-all leading-relaxed">
                        {takeawayUrl}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs ga.5" onClick={() => copyToClipboard(takeawayUrl)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs ga.5" onClick={() => window.open(takeawayUrl, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Sticky Save — General */}
            <div className="mt-8 flex justify-end">
              <Button type="submit" size="lg" className="h-12 bg-[#0f9d6a] [#0c7f56] [#0f9d6a]/30 /20 [0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled: disabled: ga" disabled={restaurantLoading || !isRestaurantDirty}>
                {restaurantLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ════════════════════════════════════════
            TAB: BILLING
        ════════════════════════════════════════ */}
        <TabsContent value="billing" className="m-0 focus-visible:outline-none">
          <form onSubmit={restaurantForm.handleSubmit(onRestaurantSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: UPI + GST */}
              <div className="lg:col-span-3 space-y-6">
                {/* UPI Feature highlight */}
                <motion.div
                  custom={0}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <QrCode className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900 mb-0.5">
                        Enable QR Payments at Your Tables
                      </p>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Add your UPI ID to automatically generate scannable QR
                        codes on every table. Customers can pay you directly — no
                        cash needed.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  custom={1}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                          <IndianRupee className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900">
                            Billing & Payments
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            UPI and business tax information
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                      {/* UPI ID */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="upi"
                          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          UPI ID
                          <span className="ml-2 font-normal normal-case text-gray-400">
                            (optional)
                          </span>
                        </Label>
                        <div className="relative">
                          <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                          <Input
                            id="upi"
                            placeholder="yourname@okbank"
                            className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-400 transition-all"
                            {...restaurantForm.register("upiId")}
                          />
                        </div>
                        {restaurantForm.formState.errors.upiId && (
                          <p className="text-xs text-red-500 font-medium">
                            {restaurantForm.formState.errors.upiId.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Format: name@bankname — e.g. rajesh@okicici
                        </p>
                      </div>

                      {/* GST Number */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="gst"
                          className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          GST Number
                          <span className="ml-2 font-normal normal-case text-gray-400">
                            (optional)
                          </span>
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="gst"
                            placeholder="22AAAAA0000A1Z5"
                            className="pl-10 h-12 rounded-xl border-gray-200 uppercase focus-visible:ring-emerald-500 focus-visible:border-emerald-400 transition-all tracking-widest"
                            {...restaurantForm.register("gstNumber")}
                          />
                        </div>
                        {restaurantForm.formState.errors.gstNumber && (
                          <p className="text-xs text-red-500 font-medium">
                            {restaurantForm.formState.errors.gstNumber.message}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Printed on customer bills and tax invoices
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Right: Info panel */}
              <div className="lg:col-span-2">
                <motion.div
                  custom={2}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/60 to-white overflow-hidden">
                    <CardHeader className="px-6 py-4 border-b border-emerald-100">
                      <CardTitle className="text-base font-semibold text-emerald-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        Why add UPI?
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {[
                        "Customers scan & pay directly from their table",
                        "No cash handling needed",
                        "QR codes auto-generated on all table cards",
                        "Instant payment confirmation",
                        "Works with any UPI app (GPay, PhonePe, Paytm)",
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button type="submit" size="lg" className="h-12 bg-[#0f9d6a] [#0c7f56] [#0f9d6a]/30 /20 [0.98] disabled:opacity-50 disabled:cursor-not-allowed ga" disabled={restaurantLoading || !isRestaurantDirty}>
                {restaurantLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ════════════════════════════════════════
            TAB: BOOKING
        ════════════════════════════════════════ */}
        <TabsContent value="booking" className="m-0 focus-visible:outline-none">
          <form onSubmit={restaurantForm.handleSubmit(onRestaurantSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left */}
              <div className="lg:col-span-3 space-y-6">
                {/* Shareable URL card */}
                <motion.div
                  custom={0}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center">
                          <Globe className="h-4 w-4 text-violet-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900">
                            Shareable Booking URL
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Share with customers to let them view your menu
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-mono text-gray-700 break-all select-all leading-relaxed">
                        {bookingUrl}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="flex-1 h-11 ga" onClick={() => copyToClipboard(bookingUrl)}
                        >
                          <Copy className="h-4 w-4" />
                          Copy Link
                        </Button>
                        <Button type="button" variant="outline" className="flex-1 h-11 ga" onClick={() => window.open(bookingUrl, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Page
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Custom Slug card */}
                <motion.div
                  custom={1}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card
                    className={`rounded-2xl shadow-sm overflow-hidden ${restaurant?.plan === "premium"
                        ? "border-emerald-100"
                        : "border-gray-100 opacity-80"
                      }`}
                  >
                    <CardHeader
                      className={`border-b px-6 py-4 ${restaurant?.plan === "premium"
                          ? "bg-gradient-to-r from-emerald-50 to-white border-emerald-100"
                          : "bg-gray-50/50 border-gray-100"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-8 w-8 rounded-xl flex items-center justify-center ${restaurant?.plan === "premium"
                                ? "bg-amber-50"
                                : "bg-gray-100"
                              }`}
                          >
                            <LinkIcon
                              className={`h-4 w-4 ${restaurant?.plan === "premium"
                                  ? "text-amber-500"
                                  : "text-gray-400"
                                }`}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold text-gray-900">
                              Custom Booking Slug
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              Create a branded URL for your restaurant
                            </CardDescription>
                          </div>
                        </div>
                        {restaurant?.plan === "premium" ? (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-xs font-semibold">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-gray-200 text-gray-400 text-xs"
                          >
                            Locked
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {restaurant?.plan === "premium" ? (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="customSlug"
                              className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                              Custom Slug
                            </Label>
                            <div className={`flex items-center gap-0 rounded-xl border focus-within:ring-2 overflow-hidden transition-all h-12 relative ${slugStatus === "available" ? "border-emerald-400 focus-within:ring-emerald-500/20" :
                                slugStatus === "taken" ? "border-red-400 focus-within:ring-red-500/20" :
                                  "border-gray-200 focus-within:border-emerald-400 focus-within:ring-emerald-500/20"
                              }`}>
                              <span className="pl-4 pr-2 text-sm text-gray-400 whitespace-nowrap shrink-0 bg-gray-50 h-full flex items-center border-r border-gray-200">
                                dineflow.pro/@
                              </span>
                              <input
                                id="customSlug"
                                placeholder="spice-garden"
                                className="w-full h-full px-3 pr-24 text-sm font-semibold text-emerald-700 bg-white focus:outline-none"
                                {...restaurantForm.register("customSlug", {
                                  onChange: (e) => {
                                    e.target.value = e.target.value
                                      .toLowerCase()
                                      .replace(/\s+/g, "-")
                                      .replace(/[^a-z0-9-]/g, "");
                                    restaurantForm.setValue("customSlug", e.target.value, { shouldValidate: true, shouldDirty: true });
                                  },
                                })}
                              />
                              <Button type="button" variant="outline" onClick={checkSlug} disabled={slugStatus === "checking" || !watchedSlug || watchedSlug === restaurant?.customSlug} className="absolute right-1 to bottom-1 h-10 hover: text-xs ga.5">
                                {slugStatus === "checking" ? (
                                  <><Loader2 className="h-3 w-3 animate-spin" /> Checking</>
                                ) : (
                                  'Check'
                                )}
                              </Button>
                            </div>
                            {restaurantForm.formState.errors.customSlug && (
                              <p className="text-xs text-red-500 font-medium mt-1">
                                {
                                  restaurantForm.formState.errors.customSlug
                                    .message
                                }
                              </p>
                            )}
                          </div>

                          {/* Live Preview badge & Results */}
                          <AnimatePresence>
                            {watchedSlug && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 font-medium">
                                    Preview:
                                  </span>
                                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-xs px-2.5 py-0.5">
                                    dineflow.pro/@{watchedSlug}
                                  </Badge>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <AnimatePresence>
                            {watchedSlug && slugStatus !== "idle" && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className={`text-xs font-semibold p-2.5 rounded-lg border mt-2 flex flex-col gap-1.5 ${slugStatus === "checking" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    slugStatus === "available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                      "bg-red-50 text-red-700 border-red-200"
                                  }`}>
                                  <div className="flex items-center gap-1.5">
                                    {slugStatus === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {slugStatus === "available" && <span className="text-base leading-none">✅</span>}
                                    {slugStatus === "taken" && <span className="text-base leading-none">❌</span>}
                                    <span>
                                      {slugStatus === "checking" && "Checking availability..."}
                                      {slugStatus === "available" && "Slug is available"}
                                      {slugStatus === "taken" && "Slug already taken"}
                                    </span>
                                  </div>
                                  {slugStatus === "taken" && slugAlternatives.length > 0 && (
                                    <div className="pt-2 border-t border-red-200/50 mt-1">
                                      <p className="text-red-900/80 mb-1.5 text-[10px] uppercase tracking-wider">Try these instead:</p>
                                      <div className="flex gap-2 flex-wrap">
                                        {slugAlternatives.map(alt => (
                                          <Button key={alt} type="button" onClick={() => restaurantForm.setValue("customSlug", alt, { shouldValidate: true, shouldDirty: true })}
                                            className="bg-white/80 hover:bg-white text-red-900 border border-red-200/60 rounded px-2 py-0.5"
                                          >
                                            {alt}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <p className="text-xs text-gray-400">
                            Only lowercase letters, numbers, and hyphens.
                            Memorable slugs work best (e.g.{" "}
                            <span className="text-emerald-600 font-medium">
                              spice-garden
                            </span>
                            )
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-6 text-center gap-3">
                          <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                            <Sparkles className="h-7 w-7 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">
                              Unlock Custom Booking URLs
                            </p>
                            <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                              Upgrade to Premium to create a branded booking link
                              like{" "}
                              <span className="font-medium text-emerald-600">
                                dineflow.pro/@spice-garden
                              </span>
                            </p>
                          </div>
                          <Button type="button" size="sm" className="mt-1 ga.5" onClick={() =>
                          (window.location.href =
                            "/restaurant/subscription")
                          }
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Upgrade to Premium
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Right: Tips */}
              <div className="lg:col-span-2">
                <motion.div
                  custom={2}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-violet-100 shadow-sm bg-gradient-to-br from-violet-50/60 to-white overflow-hidden">
                    <CardHeader className="px-6 py-4 border-b border-violet-100">
                      <CardTitle className="text-base font-semibold text-violet-900 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-violet-500" />
                        Sharing Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {[
                        "Share on WhatsApp, Instagram bio, or Google Maps",
                        "Print and hand out to regular customers",
                        "Display as a QR code at your entrance",
                        "Add to your menu cards and table tents",
                      ].map((tip, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="h-5 w-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-violet-600">
                              {i + 1}
                            </span>
                          </div>
                          <span className="text-sm text-gray-700">{tip}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button type="submit" size="lg" className="h-12 bg-[#0f9d6a] [#0c7f56] [#0f9d6a]/30 /20 [0.98] disabled:opacity-50 disabled:cursor-not-allowed ga" disabled={restaurantLoading || !isRestaurantDirty || slugStatus === "checking" || slugStatus === "taken"}>
                {restaurantLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ════════════════════════════════════════
            TAB: PROFILE
        ════════════════════════════════════════ */}
        <TabsContent value="profile" className="m-0 focus-visible:outline-none">
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left */}
              <div className="lg:col-span-3 space-y-6">
                <motion.div
                  custom={0}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-rose-50 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-rose-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900">
                            Personal Information
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Your profile details and account settings
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Profile photo */}
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="shrink-0">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2.5">
                            Profile Photo
                          </Label>
                          <ImageUpload
                            value={photoUrl}
                            onChange={setPhotoUrl}
                            folder={`users/${user?.uid}/avatar`}
                            disabled={profileLoading}
                          />
                        </div>
                        <div className="flex-1 w-full space-y-4">
                          {/* Display Name */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="userName"
                              className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                              Display Name *
                            </Label>
                            <div className="relative">
                              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                id="userName"
                                placeholder="John Doe"
                                className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-400 transition-all"
                                {...profileForm.register("name")}
                              />
                            </div>
                            {profileForm.formState.errors.name && (
                              <p className="text-xs text-red-500 font-medium">
                                {profileForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>

                          {/* Account Email (readonly) */}
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="userEmail"
                              className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                            >
                              Account Email
                            </Label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                              <Input
                                id="userEmail"
                                type="email"
                                value={user?.email || ""}
                                disabled
                                className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                              />
                            </div>
                            <p className="text-xs text-gray-400">
                              To change your email, please contact support.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Right: Account info */}
              <div className="lg:col-span-2">
                <motion.div
                  custom={1}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                >
                  <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-6 py-4">
                      <CardTitle className="text-base font-semibold text-gray-900">
                        Account Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Role</span>
                        <Badge
                          variant="outline"
                          className="border-emerald-200 text-emerald-700 bg-emerald-50"
                        >
                          Restaurant Owner
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Plan</span>
                        <Badge
                          className={
                            restaurant?.plan === "premium"
                              ? "bg-amber-100 text-amber-700 border-0"
                              : "bg-gray-100 text-gray-600 border-0"
                          }
                        >
                          {restaurant?.plan === "premium" ? "Premium" : "Basic"}
                        </Badge>
                      </div>
                      <div className="flex items-start justify-between py-2.5">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="text-sm font-medium text-gray-700 text-right max-w-[160px] truncate">
                          {user?.email}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button type="submit" size="lg" className="h-12 bg-[#0f9d6a] [#0c7f56] [#0f9d6a]/30 /20 [0.98] disabled:opacity-50 disabled:cursor-not-allowed ga" disabled={profileLoading || !isProfileDirty}>
                {profileLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
