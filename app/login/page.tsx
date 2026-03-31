"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Loader2, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth, isTokenValid } from "@/hooks/useAuth";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isTokenValid()) {
      if (pathname !== "/restaurant/dashboard" && pathname !== "/admin/dashboard") {
        router.replace("/restaurant/dashboard");
      }
    }
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        toast.success("Welcome back! 👋");
        if (userData.role === "super_admin") router.replace("/admin/dashboard");
        else router.replace("/restaurant/dashboard");
      } else {
        toast.error("User profile not found.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left branding panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0c7f56] via-[#0f9d6a] to-[#20b885] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-emerald-900/30 blur-3xl" />
        </div>

        <div className="absolute top-6 left-6 z-20">
          <Link href="/">
            <Image src="/logo.png" alt="Dineflow Icon" width={150} height={150} className="w-auto object-contain brightness-0 invert opacity-90 hover:scale-105 transition-all duration-200 drop-shadow-sm" priority />
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-auto mb-16">
          <h2 className="text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Power your restaurant with smarter tech.
          </h2>
          <p className="text-green-50 text-xl leading-relaxed opacity-90">
            QR ordering, live kitchen display, and seamless billing — all in one beautiful dashboard.
          </p>
        </div>

        <div className="relative z-10 flex gap-10 border-t border-white/20 pt-8">
          {[["500+", "Restaurants"], ["10K+", "Orders/day"], ["99.9%", "Uptime"]].map(([val, label]) => (
            <div key={label}>
              <div className="text-3xl font-extrabold text-white mb-1">{val}</div>
              <div className="text-green-100 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-green-50/50 to-white relative">
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6 z-20">
          <Link href="/">
            <Image src="/logo.png" alt="Dineflow Icon" width={150} height={150} className="w-auto object-contain opacity-90 hover:scale-105 transition-all duration-200 drop-shadow-sm" priority />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-green-900/5 p-8 border border-green-100/50"
        >

          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Welcome back</h1>
            <p className="text-gray-500 font-medium">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#0f9d6a] font-semibold hover:underline decoration-2 underline-offset-4 transition-all">
                Create one free
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-gray-700">Email address</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0f9d6a] transition-colors pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-11 h-12 rounded-xl border-gray-200 focus:border-[#0f9d6a] focus:ring-4 focus:ring-[#0f9d6a]/10 bg-gray-50/50 focus:bg-white transition-all text-base"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold text-gray-700">Password</Label>
                <Link href="#" className="text-sm text-[#0f9d6a] font-medium hover:underline">Forgot password?</Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0f9d6a] transition-colors pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-12 rounded-xl border-gray-200 focus:border-[#0f9d6a] focus:ring-4 focus:ring-[#0f9d6a]/10 bg-gray-50/50 focus:bg-white transition-all text-base"
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-2 font-bold text-[15px] rounded-xl bg-[#0f9d6a] text-white hover:bg-[#0c7f56] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#0f9d6a]/20 transition-all duration-200"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign in to dashboard"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
