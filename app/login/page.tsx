"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Loader2, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
        if (userData.role === "super_admin") router.push("/admin/dashboard");
        else router.push("/restaurant/dashboard");
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
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Left decorative panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-teal-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-80 h-80 rounded-full border-2 border-white" />
          <div className="absolute bottom-32 left-16 w-56 h-56 rounded-full border-2 border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border-2 border-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Dineflow.pro Logo" width={40} height={40} className="h-10 w-10 rounded-2xl object-cover shadow-sm bg-white/20 backdrop-blur p-1" priority />
            <span className="text-white font-bold text-xl tracking-tight">
              Dineflow<span className="text-amber-400 font-extrabold hover:text-amber-300 hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] transition-all duration-300">.pro</span>
            </span>
          </div>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Power your restaurant with smarter tech.
          </h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            QR ordering, live kitchen display, billing — all in one beautiful dashboard.
          </p>
        </div>
        <div className="relative z-10 flex gap-6">
          {[["500+", "Restaurants"], ["10K+", "Orders/day"], ["99.9%", "Uptime"]].map(([val, label]) => (
            <div key={label}>
              <div className="text-2xl font-extrabold text-white">{val}</div>
              <div className="text-emerald-200 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-10">
            <Image src="/logo.png" alt="Dineflow.pro Logo" width={36} height={36} className="h-9 w-9 object-contain" priority />
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Dineflow<span className="text-amber-500 font-extrabold hover:text-amber-400 hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-300">.pro</span>
            </span>
          </Link>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Sign in</h1>
          <p className="text-gray-500 mb-8">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-emerald-600 font-semibold hover:underline">
              Create one free
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 h-12 rounded-xl border-gray-200 focus:border-emerald-400 focus:ring-emerald-400 bg-white"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12 rounded-xl border-gray-200 focus:border-emerald-400 focus:ring-emerald-400 bg-white"
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-full bg-gradient-to-b from-[#1abc9c] to-[#16a085] text-white font-medium transition duration-200 hover:brightness-110 hover:shadow-lg focus:ring-2 focus:ring-[#1abc9c]/40"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign in to dashboard"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
