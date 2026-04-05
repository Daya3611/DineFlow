"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db, auth } from "@/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { updatePassword, updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { Loader2, Store, MapPin, Phone, Mail, Building2, QrCode, User as UserIcon, Lock, Settings, Link as LinkIcon, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const restaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name is required"),
  address: z.string().min(5, "Full address is required"),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,14}$/, "Valid phone number required (10+ digits)"),
  email: z.string().email("Invalid business email"),
  gstNumber: z.string().optional(),
  upiId: z.string().optional().refine(val => !val || val.includes("@"), "Invalid UPI format (e.g., name@bank)"),
  customSlug: z.string()
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed")
    .optional()
    .or(z.literal("")),
});

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  password: z.string().optional().refine(val => !val || val.length >= 6, "Password must be at least 6 characters"),
});

export default function SettingsPage() {
  const { user, userData, restaurant, setRestaurant, setUserData } = useAuth();

  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string>(restaurant?.logo || "");
  const [photoUrl, setPhotoUrl] = useState<string>(user?.photoURL || userData?.photoUrl || "");

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
    }
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userData?.name || user?.displayName || "",
      password: "",
    }
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
  }, [restaurant, restaurantForm]);

  useEffect(() => {
    if (userData || user) {
      profileForm.reset({
        name: userData?.name || user?.displayName || "",
        password: "",
      });
    }
  }, [userData, user, profileForm]);

  const onRestaurantSubmit = async (values: z.infer<typeof restaurantSchema>) => {
    if (!user || !userData) return;
    setRestaurantLoading(true);

    try {
      const restaurantId = restaurant?.id || `rest_${user.uid}`;

      // Check slug uniqueness
      if (values.customSlug && values.customSlug !== restaurant?.customSlug && restaurant?.plan === "premium") {
        const { query, collection, where, getDocs } = await import("firebase/firestore");
        const checkQ = query(collection(db, "restaurants"), where("customSlug", "==", values.customSlug));
        const checkSnap = await getDocs(checkQ);
        if (!checkSnap.empty) {
          toast.error("This custom URL is already taken by another restaurant.");
          setRestaurantLoading(false);
          return;
        }
      }

      const restaurantData = {
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
        customSlug: restaurant?.plan === "premium" ? (values.customSlug || "") : (restaurant?.customSlug || ""),
        createdAt: restaurant?.createdAt || Date.now(),
      };

      await setDoc(doc(db, "restaurants", restaurantId), restaurantData, { merge: true });

      if (!restaurant) {
        await updateDoc(doc(db, "users", user.uid), { restaurantId });
        setUserData({ ...userData, restaurantId });
      }

      setRestaurant(restaurantData as any);
      restaurantForm.reset(values); // reset to make it "not dirty"
      toast.success("Restaurant settings updated successfully!");
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

      // Reset password field specifically
      profileForm.reset({ name: values.name, password: "" });
      toast.success("User profile updated successfully! ✅");
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Please re-login to change password for security reasons.");
      } else {
        toast.error(error.message || "Failed to save user profile.");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const isRestaurantDirty = restaurantForm.formState.isDirty || logoUrl !== (restaurant?.logo || "");
  const isProfileDirty = profileForm.formState.isDirty || photoUrl !== (user?.photoURL || userData?.photoUrl || "");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm shadow-emerald-100">
          <Settings className="h-5 w-5 text-[#0f9d6a]" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Settings Workspace</h1>
          <p className="text-gray-500 text-sm">Manage your restaurant business and personal profile.</p>
        </div>
      </div>

      <Tabs defaultValue="restaurant" className="w-full flex flex-col md:flex-row gap-8">
        <TabsList className="flex h-auto bg-transparent space-y-2 md:w-64 w-full p-0">
          <TabsTrigger
            value="restaurant"
            className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#0f9d6a] data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-gray-100 transition-all font-medium text-gray-500 hover:text-gray-800"
          >
            <Store className="mr-2 h-4 w-4" />
            Restaurant Details
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="w-full justify-start px-4 py-3 rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#0f9d6a] data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-gray-100 transition-all font-medium text-gray-500 hover:text-gray-800"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            User Profile
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="restaurant" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
            <form onSubmit={restaurantForm.handleSubmit(onRestaurantSubmit)} className="space-y-6">
              <Card className="border-gray-100 shadow-sm shadow-gray-100 rounded-2xl overflow-hidden group">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 transition-colors group-hover:bg-gray-50">
                  <CardTitle className="text-lg">Brand Identity</CardTitle>
                  <CardDescription>Upload a square logo for your digital menu.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">Digital Menu Logo</Label>
                        <ImageUpload
                          value={logoUrl}
                          onChange={setLogoUrl}
                          folder={`restaurants/${user?.uid}/logo`}
                          disabled={restaurantLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                      <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Business Name *</Label>
                      <Input id="name" placeholder="e.g. Royal Greens Restaurant" className="h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 transition-all" {...restaurantForm.register("name")} />
                      {restaurantForm.formState.errors.name && <p className="text-xs text-red-500 font-medium">{restaurantForm.formState.errors.name.message}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-gray-100 shadow-sm shadow-gray-100 rounded-2xl group">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 transition-colors group-hover:bg-gray-50">
                    <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-4 w-4 text-[#0f9d6a]" /> Contact Info</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                      <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Full Address *</Label>
                      <Textarea id="address" placeholder="123 Green Street, City, State 400001" className="min-h-[100px] rounded-xl border-gray-200 focus-visible:ring-emerald-500 transition-all" {...restaurantForm.register("address")} />
                      {restaurantForm.formState.errors.address && <p className="text-xs text-red-500 font-medium">{restaurantForm.formState.errors.address.message}</p>}
                    </div>

                    <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                      <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input id="phone" placeholder="9876543210" className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 transition-all" {...restaurantForm.register("phoneNumber")} />
                      </div>
                      {restaurantForm.formState.errors.phoneNumber && <p className="text-xs text-red-500 font-medium">{restaurantForm.formState.errors.phoneNumber.message}</p>}
                    </div>

                    <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                      <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Business Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input id="email" type="email" placeholder="contact@restaurant.com" className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 transition-all" {...restaurantForm.register("email")} />
                      </div>
                      {restaurantForm.formState.errors.email && <p className="text-xs text-red-500 font-medium">{restaurantForm.formState.errors.email.message}</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-emerald-100 shadow-sm shadow-emerald-50 rounded-2xl ring-1 ring-emerald-50 group">
                  <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 transition-colors group-hover:bg-emerald-50">
                    <CardTitle className="text-lg flex items-center gap-2 text-emerald-900"><QrCode className="h-4 w-4 text-[#0f9d6a]" /> Billing & Payments</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl mb-4 leading-relaxed">
                      Setting a UPI ID will automatically generate scannable QR codes for your customers to pay you directly from their tables.
                    </div>

                    <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                      <Label htmlFor="upi" className="text-sm font-semibold text-gray-700">Direct UPI ID (Optional)</Label>
                      <div className="relative">
                        <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                        <Input id="upi" placeholder="yourname@okbank" className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500 transition-all" {...restaurantForm.register("upiId")} />
                      </div>
                      {restaurantForm.formState.errors.upiId && <p className="text-xs text-red-500 font-medium">{restaurantForm.formState.errors.upiId.message}</p>}
                    </div>

                    <div className="space-y-1.5 pt-2 focus-within:text-emerald-700 transition-colors">
                      <Label htmlFor="gst" className="text-sm font-semibold text-gray-700">GST Number (Optional)</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input id="gst" placeholder="22AAAAA0000A1Z5" className="pl-10 h-12 rounded-xl border-gray-200 uppercase focus-visible:ring-emerald-500 transition-all" {...restaurantForm.register("gstNumber")} />
                      </div>
                      {restaurantForm.formState.errors.gstNumber && <p className="text-xs text-red-500 font-medium">{restaurantForm.formState.errors.gstNumber.message}</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-emerald-100 shadow-sm shadow-emerald-50 rounded-2xl ring-1 ring-emerald-50 group">
                <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 transition-colors group-hover:bg-emerald-50">
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-900"><LinkIcon className="h-4 w-4 text-[#0f9d6a]" /> Booking Link</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">Your Shareable URL</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 select-all overflow-hidden text-ellipsis whitespace-nowrap">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/book/{restaurant?.plan === "premium" && restaurant.customSlug ? restaurant.customSlug : restaurant?.id}
                      </div>
                      <Button type="button" variant="outline" className="shrink-0 h-11 px-4" onClick={() => {
                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${restaurant?.plan === "premium" && restaurant.customSlug ? restaurant.customSlug : restaurant?.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link copied to clipboard!");
                      }}>
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                    </div>
                  </div>

                  {restaurant?.plan === "premium" ? (
                    <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors pt-4 border-t border-emerald-100 mt-4">
                      <Label htmlFor="customSlug" className="text-sm font-semibold text-gray-700">Custom Booking Slug</Label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">
                          dineflow.pro/book/
                        </span>
                        <Input
                          id="customSlug"
                          placeholder="e.g. spice-garden"
                          className="pl-[125px] h-12 rounded-xl border-emerald-200 focus-visible:ring-emerald-500 transition-all font-medium text-emerald-900"
                          {...restaurantForm.register("customSlug", {
                            onChange: (e) => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }
                          })}
                        />
                      </div>
                      {restaurantForm.formState.errors.customSlug && <p className="text-xs text-red-500 font-medium">{restaurantForm.formState.errors.customSlug.message}</p>}
                      <p className="text-xs text-emerald-600 mt-1 font-medium">Use a descriptive, memorable name for your restaurant. Only lowercase letters, numbers, and hyphens.</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl mt-4 leading-relaxed font-medium">
                      🚀 <span className="font-bold">Upgrade to Premium</span> to unlock a branded Custom Booking URL (e.g. {typeof window !== 'undefined' ? window.location.hostname : 'dineflow.pro'}/book/spice-garden).
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 px-8 rounded-full bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
                  disabled={restaurantLoading || !isRestaurantDirty}
                >
                  {restaurantLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Restaurant Settings"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="profile" className="m-0 focus-visible:ring-0 focus-visible:outline-none">
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <Card className="border-gray-100 shadow-sm shadow-gray-100 rounded-2xl overflow-hidden group">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 transition-colors group-hover:bg-gray-50">
                  <CardTitle className="text-lg flex items-center gap-2"><UserIcon className="h-4 w-4 text-[#0f9d6a]" /> Personal Information</CardTitle>
                  <CardDescription>Update your personal details and profile picture.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">Profile Photo</Label>
                        <ImageUpload
                          value={photoUrl}
                          onChange={setPhotoUrl}
                          folder={`users/${user?.uid}/avatar`}
                          disabled={profileLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                        <Label htmlFor="userName" className="text-sm font-semibold text-gray-700">Display Name</Label>
                        <div className="relative">
                          <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input id="userName" placeholder="John Doe" className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 transition-all" {...profileForm.register("name")} />
                        </div>
                        {profileForm.formState.errors.name && <p className="text-xs text-red-500 font-medium">{profileForm.formState.errors.name.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="userEmail" className="text-sm font-semibold text-gray-700">Account Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input id="userEmail" type="email" value={user?.email || ""} disabled className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed opacity-80" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">To change your account email, please contact support.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* <Card className="border-gray-100 shadow-sm shadow-gray-100 rounded-2xl group">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 transition-colors group-hover:bg-gray-50">
                  <CardTitle className="text-lg flex items-center gap-2"><Lock className="h-4 w-4 text-[#0f9d6a]" /> Security</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5 focus-within:text-emerald-700 transition-colors">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input id="password" type="password" placeholder="Leave blank to keep current password" className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500 transition-all" {...profileForm.register("password")} autoComplete="new-password" />
                    </div>
                    {profileForm.formState.errors.password && <p className="text-xs text-red-500 font-medium">{profileForm.formState.errors.password.message}</p>}
                  </div>
                </CardContent>
              </Card> */}

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 px-8 rounded-full bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
                  disabled={profileLoading || !isProfileDirty}
                >
                  {profileLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Profile Details"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
