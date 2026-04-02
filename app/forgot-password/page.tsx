"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const emailValue = watch("email");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSubmitted(true);
      toast.success("Reset link sent to your email!");
    } catch (error: any) {
      // Clean up firebase error messages
      let errorMsg = "Failed to send reset email. Please try again.";
      if (error.code === "auth/user-not-found") {
        errorMsg = "No account found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Invalid email address format.";
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F9FAFB] relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-emerald-100/40 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-green-100/30 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex justify-center mb-8"
        >
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Dineflow Icon"
              width={140}
              height={140}
              className="w-auto h-12 object-contain hover:scale-105 transition-transform duration-300 drop-shadow-sm"
              priority
            />
          </Link>
        </motion.div>

        {/* Card */}
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-xl shadow-green-900/5 p-8 border border-green-100/50"
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
                  Forgot your password?
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                  Enter your email and we’ll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold text-gray-700">
                    Email address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#16a34a] transition-colors pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-11 h-12 rounded-xl border-gray-200 focus:border-[#16a34a] focus:ring-4 focus:ring-[#16a34a]/10 bg-gray-50/50 focus:bg-white transition-all text-base"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-12 font-bold text-[15px] rounded-xl bg-[#16a34a] text-white hover:bg-[#15803d] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#16a34a]/20 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                    disabled={loading || !emailValue}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>

                  <Link href="/login" className="flex items-center justify-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to login
                  </Link>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
              className="bg-white rounded-2xl shadow-xl shadow-green-900/5 p-8 border border-green-100/50 text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-[#16a34a]" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
                Check your inbox
              </h1>
              <p className="text-sm text-gray-500 font-medium mb-8">
                We've sent a password reset link to <br />
                <span className="font-bold text-gray-900">{emailValue}</span>
              </p>
              
              <Link href="/login">
                <Button className="w-full h-12 font-bold text-[15px] rounded-xl bg-gray-900 text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                  Return to login
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
