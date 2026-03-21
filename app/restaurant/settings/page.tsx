"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db } from "@/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, UploadCloud, Store, MapPin, Phone, Mail, Building2, QrCode } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";

const formSchema = z.object({
  name: z.string().min(2, "Restaurant name is required"),
  address: z.string().min(5, "Full address is required"),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,14}$/, "Valid phone number required (10+ digits)"),
  email: z.string().email("Invalid business email"),
  gstNumber: z.string().optional(),
  upiId: z.string().optional().refine(val => !val || val.includes("@"), "Invalid UPI format (e.g., name@bank)"),
});

export default function RestaurantSettings() {
  const { user, userData, restaurant, setRestaurant, setUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(restaurant?.logo || "");

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: restaurant?.name || "",
      address: restaurant?.address || "",
      phoneNumber: restaurant?.phoneNumber || "",
      email: restaurant?.email || "",
      gstNumber: restaurant?.gstNumber || "",
      upiId: restaurant?.upiId || "",
    }
  });



  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !userData) return;
    setLoading(true);

    try {
      const restaurantId = restaurant?.id || `rest_${user.uid}`;

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
        createdAt: restaurant?.createdAt || Date.now(),
      };

      await setDoc(doc(db, "restaurants", restaurantId), restaurantData, { merge: true });

      if (!restaurant) {
        await updateDoc(doc(db, "users", user.uid), { restaurantId });
        setUserData({ ...userData, restaurantId });
      }

      setRestaurant(restaurantData as any);
      toast.success("Profile updated successfully! ✅");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Store className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Business Profile</h1>
          <p className="text-gray-500 text-sm">Manage your restaurant details and payment settings.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-gray-100 shadow-sm shadow-gray-100 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
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
                     disabled={loading} 
                   />
                 </div>
              </div>
              <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Business Name *</Label>
                  <Input id="name" placeholder="e.g. Royal Greens Restaurant" className="h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500" {...register("name")} />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-gray-100 shadow-sm shadow-gray-100 rounded-2xl">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600"/> Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Full Address *</Label>
                <Textarea id="address" placeholder="123 Green Street, City, State 400001" className="min-h-[100px] rounded-xl border-gray-200 focus-visible:ring-emerald-500" {...register("address")} />
                {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="phone" placeholder="9876543210" className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500" {...register("phoneNumber")} />
                </div>
                {errors.phoneNumber && <p className="text-xs text-red-500">{errors.phoneNumber.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Business Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="email" type="email" placeholder="contact@restaurant.com" className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:ring-emerald-500" {...register("email")} />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 shadow-sm shadow-emerald-50 rounded-2xl ring-1 ring-emerald-50">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-900"><QrCode className="h-4 w-4 text-emerald-600"/> Billing & Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl mb-4">
                Setting a UPI ID will automatically generate scannable QR codes for your customers to pay you directly from their tables.
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="upi" className="text-sm font-semibold text-gray-700">Direct UPI ID (Optional)</Label>
                <div className="relative">
                  <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  <Input id="upi" placeholder="yourname@okbank" className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500" {...register("upiId")} />
                </div>
                {errors.upiId && <p className="text-xs text-red-500">{errors.upiId.message}</p>}
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="gst" className="text-sm font-semibold text-gray-700">GST Number (Optional)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="gst" placeholder="22AAAAA0000A1Z5" className="pl-10 h-12 rounded-xl border-gray-200 uppercase focus-visible:ring-emerald-500" {...register("gstNumber")} />
                </div>
                {errors.gstNumber && <p className="text-xs text-red-500">{errors.gstNumber.message}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Save Profile Configuration"}
          </Button>
        </div>
      </form>
    </div>
  );
}
