"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Loader2, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
      if (assignedRole === "super_admin") router.push("/admin/dashboard");
      else router.push("/restaurant/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-80 h-80 rounded-full border-2 border-white" />
          <div className="absolute bottom-32 left-16 w-56 h-56 rounded-full border-2 border-white" />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <Image src="/logo.png" alt="Dineflow.pro Logo" width={140} height={36} className="h-10 w-auto object-contain shadow-sm bg-white/20 backdrop-blur p-1 rounded-sm" priority />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Your restaurant, fully digital.
          </h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Create your account and start accepting QR-based table orders in minutes.
          </p>
        </div>
        <div className="relative z-10 flex gap-6">
          {[["Free", "No credit card"], ["2 min", "Setup time"], ["∞", "Menu items"]].map(([val, label]) => (
            <div key={label}>
              <div className="text-2xl font-extrabold text-white">{val}</div>
              <div className="text-emerald-200 text-sm">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-10">
            <Image src="/logo.png" alt="Dineflow.pro Logo" width={140} height={36} className="h-9 w-auto object-contain" priority />
          </Link>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Create account</h1>
          <p className="text-gray-500 mb-8">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0f9d6a] font-semibold hover:underline">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input id="name" placeholder="John Doe" className="pl-10 h-12 rounded-xl border-gray-200 bg-white" {...register("name")} />
              </div>
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input id="email" type="email" placeholder="name@example.com" className="pl-10 h-12 rounded-xl border-gray-200 bg-white" {...register("email")} />
              </div>
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input id="password" type="password" placeholder="Min. 6 characters" className="pl-10 h-12 rounded-xl border-gray-200 bg-white" {...register("password")} />
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-4 rounded-full bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30 transition duration-200"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create free account"}
            </Button>

            <p className="text-xs text-center text-gray-400 pt-2">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
