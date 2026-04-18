"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth, isTokenValid } from "@/hooks/useAuth";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();

  // Steps: 1 = Email, 2 = OTP, 3 = Password & Name
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (isTokenValid()) {
      if (pathname !== "/restaurant/dashboard" && pathname !== "/admin/dashboard") {
        router.replace("/restaurant/dashboard");
      }
    }
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  });

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      toast.success("Verification code sent to your email!");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid verification code");

      toast.success("Email verified!");
      setStep(3);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    setLoading(true);
    try {
      // Create user only after OTP is strictly verified
      const userCredential = await createUserWithEmailAndPassword(auth, email, values.password);
      const user = userCredential.user;

      // Secure Role Assignment
      const assignedRole = email.toLowerCase() === "hi@dayanandgawade.in" ? "super_admin" : "restaurant_owner";

      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name: values.name,
        email: email,
        role: assignedRole,
        provider: "email",
        createdAt: Date.now(),
      });

      toast.success("Account created! Welcome to Dineflow 🎉");
      if (assignedRole === "super_admin") router.replace("/admin/dashboard");
      else router.replace("/restaurant/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          id: user.uid,
          name: user.displayName || "Restaurant Owner",
          email: user.email,
          role: "restaurant_owner",
          provider: "google",
          createdAt: Date.now(),
        });
        toast.success("Account created successfully! 👋");
        router.replace("/restaurant/dashboard");
      } else {
        const userData = userDoc.data();
        toast.success("Welcome back! 👋");
        if (userData.role === "super_admin") router.replace("/admin/dashboard");
        else router.replace("/restaurant/dashboard");
      }
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        toast.error(error.message || "Google Sign-In failed");
      } else {
        toast.error("Sign-in cancelled.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-50 via-white to-white relative overflow-hidden">
      {/* Background blur/glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-100/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Header - Centered */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="mb-6 flex items-center justify-center hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="Dineflow Logo" width={48} height={48} className="h-10 w-auto object-contain" priority />
            <span className="ml-2 font-bold text-2xl tracking-tight text-gray-900">Dineflow</span>
          </Link>
          <h1 className="text-[1.75rem] font-bold text-gray-900 mb-2">Create account</h1>
          <p className="text-gray-600 text-sm font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-green-600 font-medium hover:underline transition-all">
              Sign in
            </Link>
          </p>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-800">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-3 px-4 h-12 rounded-xl border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 bg-white transition-all duration-200 shadow-sm"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 mt-2 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-200"
                    disabled={loading || googleLoading}
                  >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Continue with Email"}
                  </Button>
                </form>

                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-3 text-gray-500 font-medium">Or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-[15px] font-medium shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="mr-2.5 h-4.5 w-4.5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Continue with Google
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6 flex items-center">
                  <button type="button" onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-700 transition flex items-center text-sm font-medium">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </button>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Verify your email</h3>
                  <p className="text-sm text-gray-500 mt-1">We sent a 6-digit code to <strong className="text-gray-700 font-bold">{email}</strong></p>
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-6 flex flex-col items-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={loading} className="gap-2">
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} className="w-10 h-10 " />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-200"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verify Code"}
                  </Button>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Complete Profile</h3>
                  <p className="text-sm text-gray-500 mt-1">Almost there! Set your details to finish.</p>
                </div>

                <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-800">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      className="w-full py-3 px-4 h-12 rounded-xl border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 bg-white transition-all duration-200 shadow-sm"
                      {...register("name")}
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-800">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 characters"
                      className="w-full py-3 px-4 h-12 rounded-xl border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 bg-white transition-all duration-200 shadow-sm"
                      {...register("password")}
                    />
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-800">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm password"
                      className="w-full py-3 px-4 h-12 rounded-xl border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 bg-white transition-all duration-200 shadow-sm"
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 mt-2 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md hover:shadow-lg transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Account"}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step === 1 && (
          <p className="mt-8 text-center text-xs text-gray-500 font-medium">
            By clicking continue, you agree to our{" "}
            <Link href="#" className="underline hover:text-gray-700 underline-offset-2">Terms of Service</Link>
            {" "}and{" "}
            <Link href="#" className="underline hover:text-gray-700 underline-offset-2">Privacy Policy</Link>.
          </p>
        )}
      </div>
    </div>
  );
}


