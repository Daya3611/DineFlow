"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Loader2, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth, isTokenValid } from "@/hooks/useAuth";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function RegisterPage() {
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
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Secure Role Assignment
      const assignedRole = values.email.toLowerCase() === "hi@dayanandgawade.in"
        ? "super_admin"
        : "restaurant_owner";

      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name: values.name,
        email: values.email,
        role: assignedRole,
        createdAt: Date.now(),
      });

      toast.success("Account created! Welcome to Dineflow.pro 🎉");
      if (assignedRole === "super_admin") router.replace("/admin/dashboard");
      else router.replace("/restaurant/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0c7f56] via-[#0f9d6a] to-[#20b885] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-emerald-900/30 blur-3xl" />
        </div>

        <div className="absolute top-6 left-6 z-20">
          <Link href="/">
            <Image src="/logo.png" alt="Dineflow Icon" width={150} height={150} className=" w-auto object-contain brightness-0 invert opacity-90 hover:scale-105 transition-all duration-200 drop-shadow-sm" priority />
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-auto mb-16">
          <h2 className="text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Your restaurant, fully digital.
          </h2>
          <p className="text-green-50 text-xl leading-relaxed opacity-90">
            Create your account and start accepting QR-based table orders in minutes. Setup is seamless and fast.
          </p>
        </div>

        <div className="relative z-10 flex gap-10 border-t border-white/20 pt-8">
          {[["Free", "No credit card"], ["2 min", "Setup time"], ["∞", "Menu items"]].map(([val, label]) => (
            <div key={label}>
              <div className="text-3xl font-extrabold text-white mb-1">{val}</div>
              <div className="text-green-100 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
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
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Create account</h1>
            <p className="text-gray-500 font-medium">
              Already have an account?{" "}
              <Link href="/login" className="text-[#0f9d6a] font-semibold hover:underline decoration-2 underline-offset-4 transition-all">Sign in here</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-bold text-gray-700">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0f9d6a] transition-colors pointer-events-none" />
                <Input id="name" placeholder="John Doe" className="pl-11 h-12 rounded-xl border-gray-200 focus:border-[#0f9d6a] focus:ring-4 focus:ring-[#0f9d6a]/10 bg-gray-50/50 focus:bg-white transition-all text-base" {...register("name")} />
              </div>
              {errors.name && <p className="text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-gray-700">Email address</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0f9d6a] transition-colors pointer-events-none" />
                <Input id="email" type="email" placeholder="name@example.com" className="pl-11 h-12 rounded-xl border-gray-200 focus:border-[#0f9d6a] focus:ring-4 focus:ring-[#0f9d6a]/10 bg-gray-50/50 focus:bg-white transition-all text-base" {...register("email")} />
              </div>
              {errors.email && <p className="text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-bold text-gray-700">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#0f9d6a] transition-colors pointer-events-none" />
                <Input id="password" type="password" placeholder="Min. 6 characters" className="pl-11 h-12 rounded-xl border-gray-200 focus:border-[#0f9d6a] focus:ring-4 focus:ring-[#0f9d6a]/10 bg-gray-50/50 focus:bg-white transition-all text-base" {...register("password")} />
              </div>
              {errors.password && <p className="text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-6 font-bold text-[15px] rounded-xl bg-[#0f9d6a] text-white hover:bg-[#0c7f56] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#0f9d6a]/20 transition-all duration-200"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create free account"}
            </Button>

            <p className="text-xs text-center text-gray-400 pt-4 font-medium">
              By signing up, you agree to our <Link href="#" className="text-gray-500 hover:text-[#0f9d6a] underline">Terms of Service</Link> and <Link href="#" className="text-gray-500 hover:text-[#0f9d6a] underline">Privacy Policy</Link>.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
