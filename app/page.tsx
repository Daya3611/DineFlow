"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChefHat, Utensils, QrCode, BarChart3, Zap, Shield, Star } from "lucide-react";

const features = [
  {
    title: "Digital QR Menus",
    icon: QrCode,
    color: "bg-emerald-100 text-emerald-600",
    desc: "Customers scan a QR code and instantly browse your beautiful digital menu — no app download required.",
  },
  {
    title: "Live Order Tracking",
    icon: Utensils,
    color: "bg-amber-100 text-amber-600",
    desc: "Real-time kitchen display with instant sound alerts. Never miss an order from your tables again.",
  },
  {
    title: "Smart Analytics",
    icon: BarChart3,
    color: "bg-sky-100 text-sky-600",
    desc: "Track revenue, popular items, and customer behavior with actionable daily insights.",
  },
  {
    title: "Instant Setup",
    icon: Zap,
    color: "bg-violet-100 text-violet-600",
    desc: "Go live in minutes. Add your menu, generate QR codes for each table, and you're done.",
  },
  {
    title: "Secure & Reliable",
    icon: Shield,
    color: "bg-rose-100 text-rose-600",
    desc: "Enterprise-grade Firebase security rules ensure your data is always private and protected.",
  },
  {
    title: "Razorpay Payments",
    icon: Star,
    color: "bg-orange-100 text-orange-600",
    desc: "Seamlessly accept subscription payments. Choose plans that scale with your restaurant.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white relative overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
            <ChefHat className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 tracking-tight">DineFlow</span>
        </div>
        <nav className="hidden md:flex gap-8 font-medium text-sm text-gray-500">
          <Link href="#features" className="hover:text-emerald-600 transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-emerald-600 font-medium">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm shadow-emerald-200 rounded-xl px-5">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-[#ECFDF5] via-white to-white" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-emerald-200/30 rounded-full blur-3xl -z-10" />
          </div>

          <div className="container mx-auto px-6 max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full border border-emerald-200 mb-8"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Now with real-time QR ordering
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]"
            >
              The smarter way to{" "}
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
                  run your restaurant
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 10 Q150 2 298 10" stroke="#10B981" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              QR-based menu ordering, real-time kitchen display, smart billing, and powerful analytics — all in one beautiful platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register">
                <Button size="lg" className="h-13 px-8 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xl shadow-emerald-200/60 rounded-2xl transition-all hover:scale-105">
                  Start free trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-13 px-8 text-base border-gray-200 text-gray-600 rounded-2xl hover:border-emerald-200 hover:text-emerald-600">
                  Sign in to dashboard
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicator */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-sm text-gray-400"
            >
              No credit card required · Setup in 2 minutes · Cancel anytime
            </motion.p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-[#F9FAFB]">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center text-emerald-600 font-semibold text-sm bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 mb-4">
                Everything you need
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
                Built for real restaurants
              </h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                From table QR codes to live kitchen display — every feature is designed to save time and delight customers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.45, delay: i * 0.07 }}
                    className="bg-white p-7 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300 group cursor-default"
                  >
                    <div className={`h-11 w-11 rounded-xl ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section id="pricing" className="py-24 bg-gradient-to-br from-emerald-600 to-teal-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl" />
          </div>
          <div className="container mx-auto px-6 max-w-3xl text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">
              Ready to modernize your restaurant?
            </h2>
            <p className="text-emerald-100 text-lg mb-10 max-w-xl mx-auto">
              Join restaurants using DineFlow to serve customers faster, smarter, and without paper menus.
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-10 h-14 text-base rounded-2xl shadow-xl transition-all hover:scale-105">
                Start free today <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-900">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ChefHat className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-base">DineFlow</span>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} DineFlow. Built for modern restaurants.</p>
        </div>
      </footer>
    </div>
  );
}
