"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, Variants, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChefHat,
  Utensils,
  QrCode,
  BarChart3,
  Zap,
  Shield,
  CheckCircle2,
  Twitter,
  Instagram,
  Linkedin,
  Star,
  Receipt,
  BellRing,
  Menu,
  X,
} from "lucide-react";
import { useAuth, isTokenValid } from "@/hooks/useAuth";
import HomeScroll from "@/components/HomeScroll";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    title: "QR Ordering",
    icon: QrCode,
    color: "bg-emerald-100 text-[#0f9d6a]",
    desc: "Customers scan & instantly browse your digital menu. Zero app required.",
  },
  {
    title: "Real-Time Kitchen",
    icon: BellRing,
    color: "bg-amber-100 text-amber-600",
    desc: "Live order alerts with sound. Your kitchen never misses a beat.",
  },
  {
    title: "Smart Billing",
    icon: Receipt,
    color: "bg-sky-100 text-sky-600",
    desc: "Auto-generate itemised bills with UPI & counter payment options.",
  },
  {
    title: "Analytics Dashboard",
    icon: BarChart3,
    color: "bg-violet-100 text-violet-600",
    desc: "Track daily revenue, order trends, and top-selling items effortlessly.",
  },
  {
    title: "Instant Setup",
    icon: Zap,
    color: "bg-orange-100 text-orange-600",
    desc: "Upload your menu, print QR codes, go live — all in under 2 minutes.",
  },
  {
    title: "Secure & Reliable",
    icon: Shield,
    color: "bg-rose-100 text-rose-600",
    desc: "Enterprise-grade Firebase security. Your data is always private.",
  },
];

const steps = [
  {
    step: "01",
    title: "Set Up Your Restaurant",
    desc: "Create your account, upload your menu items with photos, and customise your digital presence.",
    icon: ChefHat,
  },
  {
    step: "02",
    title: "Generate Table QR Codes",
    desc: "Print unique QR codes for each table in seconds. Customers scan and order directly from their seats.",
    icon: QrCode,
  },
  {
    step: "03",
    title: "Manage Orders & Billing",
    desc: "Watch orders roll in live, update kitchen status, and generate bills — all from one screen.",
    icon: Utensils,
  },
];

const stats = [
  { value: "500+", label: "Restaurants onboarded" },
  { value: "50K+", label: "Orders processed" },
  { value: "4.9★", label: "Average rating" },
  { value: "2 min", label: "Average setup time" },
];

const testimonials = [
  {
    name: "Rahul Mehra",
    title: "Owner, Spice Garden",
    body: "Dineflow.pro completely transformed how we handle orders. Our staff is faster and customers love scanning QR codes.",
    avatar: "RM",
    color: "bg-[#0f9d6a]",
  },
  {
    name: "Priya Shah",
    title: "Manager, The Green Table",
    body: "Setting up took less than 10 minutes. The live order dashboard is a game changer for our kitchen team.",
    avatar: "PS",
    color: "bg-teal-600",
  },
  {
    name: "Vikram Nair",
    title: "Founder, Curry & Co.",
    body: "The analytics alone are worth it. I can finally see which dishes perform best during weekends vs weekdays.",
    avatar: "VN",
    color: "bg-sky-600",
  },
];

const plans = [
  {
    name: "Starter",
    price: "₹199",
    period: "/month",
    desc: "Perfect for small restaurants and cafés just getting started.",
    features: [
      "Up to 20 menu items",
      "QR code for 5 tables",
      "Live order management",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/month",
    desc: "For growing restaurants that need the full Dineflow.pro experience.",
    features: [
      "Unlimited menu items",
      "QR codes for unlimited tables",
      "Advanced analytics & reports",
      "UPI & Razorpay payments",
      "Priority support",
      "Custom restaurant branding",
    ],
    cta: "Get Pro — Most Popular",
    highlighted: true,
  },
];

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, delay, ease: "easeOut" as const },
});

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { userData } = useAuth();

  useEffect(() => {
    setIsLoggedIn(isTokenValid());
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    if (typeof window !== 'undefined' && (window as any).lenis) {
      (window as any).lenis.scrollTo(`#${id}`);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
    setMobileMenuOpen(false);
  };

  const dashboardLink = userData?.role === "super_admin" ? "/admin/dashboard" : "/restaurant/dashboard";

  return (
    <HomeScroll>
      <BackgroundRippleEffect />
      <div className="flex flex-col min-h-screen bg-white font-sans antialiased">

        {/* ── Floating Navbar ── */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl px-0">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center justify-between px-4 sm:px-6 py-2.5
              bg-white/80 backdrop-blur-xl
              border border-gray-200/80
              rounded-full "
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                <Image src="/logo.png" alt="Dineflow Icon" width={32} height={32} className="object-contain" priority />
              </div>
              <strong className="text-[17px] font-extrabold tracking-tight text-gray-900 leading-none">
                Dineflow<span className="text-[#0f9d6a]">.pro</span>
              </strong>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1 text-[14px] font-medium text-gray-500">
              <Link href="#features" onClick={(e) => scrollToSection(e, 'features')} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all duration-150">Features</Link>
              <Link href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all duration-150">How it works</Link>
              <Link href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all duration-150">Pricing</Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <Link href={dashboardLink} className="hidden md:block shrink-0">
                  <Button className="h-9 text-[13px] bg-[#0f9d6a] [#0c7f56] [1.03] [0.98] rounded-full hover:bg-white hover:text-emerald-700">
                    Dashboard →
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="hidden md:block text-[14px] font-semibold text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-full hover:bg-gray-100">
                    Log in
                  </Link>
                  <Link href="/register" className="hidden md:block shrink-0">
                    <Button className="h-9 text-[13px] text-slate-700 rounded-full hover:bg-white hover:text-emerald-700">
                      Start Free Trial
                    </Button>
                  </Link>
                </>
              )}
              <Button className="md:hidden .5 text-gray-600 hover: shrink-0" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </motion.div>

          {/* Mobile Nav Dropdown */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="md:hidden mt-2 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
              >
                <div className="flex flex-col p-3 gap-0.5 text-[15px] font-medium text-gray-700">
                  <Link href="#features" onClick={(e) => scrollToSection(e, 'features')} className="px-4 py-3 rounded-xl hover:bg-gray-50 hover:text-[#0f9d6a] transition-colors">Features</Link>
                  <Link href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="px-4 py-3 rounded-xl hover:bg-gray-50 hover:text-[#0f9d6a] transition-colors">How it works</Link>
                  <Link href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="px-4 py-3 rounded-xl hover:bg-gray-50 hover:text-[#0f9d6a] transition-colors">Pricing</Link>
                  <div className="h-px bg-gray-100 my-1" />
                  {isLoggedIn ? (
                    <Link href={dashboardLink} onClick={() => setMobileMenuOpen(false)} className="mt-1">
                      <Button className="w-full h-11 bg-[#0f9d6a] [#0c7f56]">
                        Go to Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-xl hover:bg-gray-50 hover:text-[#0f9d6a] transition-colors">Log in</Link>
                      <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="mt-1">
                        <Button className="w-full h-11 bg-[#0f9d6a] [#0c7f56]">
                          Start Free Trial
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spacer for fixed navbar */}
        <div className="h-20" />

        <main className="flex-1">

          {/* ── Hero ── */}
          <section className="relative overflow-hidden  pb-16 md:pb-24">
            {/* Background blobs */}
            {/* <div className="absolute inset-0 -z-10 bg-gradient-to-b from-green-50/40 via-white to-white overflow-hidden">
              <motion.div
                animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                className="absolute top-0 left-1/4 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-200/20 rounded-full blur-[120px] -z-10"
              />
              <motion.div
                animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
                transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
                className="absolute top-20 right-1/4 translate-x-1/2 w-[600px] h-[600px] bg-teal-100/30 rounded-full blur-[120px] -z-10"
              />
            </div> */}

            <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6">

              {/* Floating subtle background glow */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-green-50 via-white to-white" />

              {/* CONTENT */}
              <div className="max-w-5xl text-center">

                {/* TRUST BADGE */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm text-gray-600 shadow-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Trusted by 500+ restaurants across India
                </motion.div>

                {/* HEADLINE */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-3xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-7xl"
                >
                  The smarter way to{" "}
                  <span className="text-green-600 relative">
                    run your <span className="pacifico-regular">Restaurant</span>
                    <span className="absolute left-0 -bottom-2 h-2 w-full bg-green-200 rounded-full" />
                  </span>
                </motion.h1>

                {/* SUBTEXT */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="mx-auto mt-6 max-w-2xl text-base text-gray-600 md:text-lg"
                >
                  QR-based ordering, real-time kitchen tracking, smart billing, and powerful analytics — all in one platform built for modern restaurants.
                </motion.p>

                {/* CTA BUTTONS */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
                >
                  <button className="rounded-xl bg-green-600 px-6 py-3 text-white font-medium shadow-lg hover:bg-green-700 transition" onClick={() => window.location.href = '/register'}>
                    Start Free Trial →
                  </button>

                  <button className="rounded-xl border px-6 py-3 text-gray-700 hover:bg-gray-100 transition">
                    See How It Works
                  </button>
                </motion.div>

                {/* TRUST TEXT */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 text-sm text-gray-500"
                >
                  No credit card required · Setup in 2 minutes · Cancel anytime
                </motion.p>
              </div>
            </section>
          </section>

          {/* ── Social proof stats ── */}
          <section className="py-14 border-y border-gray-100 bg-gray-50/50">
            <div className="container mx-auto px-6 max-w-5xl">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-gray-200"
              >
                {stats.map((s, i) => (
                  <motion.div key={i} variants={staggerItem} className="text-center md:px-6">
                    <div className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">{s.value}</div>
                    <div className="text-sm text-gray-500 font-medium">{s.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ── Features ── */}
          <section id="features" className="py-24 bg-white">
            <div className="container mx-auto px-6 max-w-6xl">
              <div className="text-center mb-16">
                <motion.div {...fadeUp(0)} className="inline-flex items-center text-slate-700 font-semibold text-sm bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200 mb-4">
                  Powerful features
                </motion.div>
                <motion.h2 {...fadeUp(0.08)} className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-5">
                  Everything you need to<br />run your <span className="caveat-regular text-green-600">Restaurant</span>
                </motion.h2>
                <motion.p {...fadeUp(0.14)} className="text-gray-500 text-lg max-w-xl mx-auto">
                  Every feature is crafted to save time, reduce errors, and delight your customers.
                </motion.p>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.div
                      key={i}
                      variants={staggerItem}
                      className="bg-white p-7 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50/80 transition-all duration-300 group cursor-default"
                    >
                      <div className={`h-12 w-12 rounded-xl ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </section>

          {/* ── How It Works ── */}
          <section id="how-it-works" className="py-24 bg-[#F9FAFB]">
            <div className="container mx-auto px-6 max-w-6xl">
              <div className="text-center mb-16">
                <motion.div {...fadeUp(0)} className="inline-flex items-center text-emerald-700 font-semibold text-sm bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 mb-4">
                  Simple setup
                </motion.div>
                <motion.h2 {...fadeUp(0.07)} className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                  Up and running in 3 steps
                </motion.h2>
                <motion.p {...fadeUp(0.13)} className="text-gray-500 text-lg max-w-lg mx-auto">
                  No technical skills needed. No engineers required. Just sign up and serve.
                </motion.p>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="grid md:grid-cols-3 gap-8 relative"
              >
                {/* Connector line (desktop only) */}
                <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />

                {steps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.div key={i} variants={staggerItem} className="text-center relative">
                      <div className="relative inline-flex items-center justify-center mb-6 pt-3 pr-3">
                        <div className="h-20 w-20 rounded-full bg-white border-2 border-emerald-100 shadow-lg shadow-emerald-100/40 flex items-center justify-center z-10 relative">
                          <Icon className="h-8 w-8 text-[#0f9d6a]" />
                        </div>
                        <span className="absolute top-0 right-0 text-[10px] font-black bg-[#0f9d6a] text-white rounded-full h-6 w-6 flex items-center justify-center shadow-md z-20">
                          {s.step}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-gray-900 mb-3">{s.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </section>

          {/* ── Pricing ── */}
          <section id="pricing" className="py-24 bg-white">
            <div className="container mx-auto px-6 max-w-5xl">
              <div className="text-center mb-16">
                <motion.div {...fadeUp(0)} className="inline-flex items-center text-slate-700 font-semibold text-sm bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200 mb-4">
                  Simple pricing
                </motion.div>
                <motion.h2 {...fadeUp(0.07)} className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                  Pay only for what you need
                </motion.h2>
                <motion.p {...fadeUp(0.13)} className="text-gray-500 text-lg max-w-md mx-auto">
                  No hidden fees. Cancel anytime. Start free for 14 days.
                </motion.p>
              </div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto"
              >
                {plans.map((plan, i) => (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                    className={`relative rounded-2xl p-8 flex flex-col border-2 transition-all ${plan.highlighted
                      ? "border-emerald-500 bg-[#0f9d6a] text-white shadow-2xl shadow-[0_4px_14px_rgba(15,157,106,0.2)] scale-[1.02]"
                      : "border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-gray-200"
                      }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-extrabold px-4 py-1 rounded-full shadow-md">
                        ⚡ Most Popular
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className={`text-lg font-extrabold mb-1 ${plan.highlighted ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
                      <p className={`text-sm mb-4 ${plan.highlighted ? "text-emerald-100" : "text-gray-500"}`}>{plan.desc}</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-5xl font-extrabold ${plan.highlighted ? "text-white" : "text-gray-900"}`}>{plan.price}</span>
                        <span className={`text-sm font-medium ${plan.highlighted ? "text-emerald-200" : "text-gray-400"}`}>{plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((feat, j) => (
                        <li key={j} className="flex items-center gap-2.5 text-sm font-medium">
                          <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlighted ? "text-emerald-300" : "text-emerald-500"}`} />
                          <span className={plan.highlighted ? "text-emerald-50" : "text-gray-700"}>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/register">
                      <Button size="lg" className={`w-full font-medium rounded-full h-12 transition duration-200 ${plan.highlighted ? "bg-white text-[#0f9d6a] hover:bg-slate-50" : "bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30"}`}>
                        {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ── Testimonials ── */}
          <section className="py-24 bg-[#F9FAFB]">
            <div className="container mx-auto px-6 max-w-6xl">
              <div className="text-center mb-16">
                <motion.div {...fadeUp(0)} className="inline-flex items-center text-slate-700 font-semibold text-sm bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200 mb-4">
                  Real reviews
                </motion.div>
                <motion.h2 {...fadeUp(0.07)} className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
                  Loved by restaurant owners
                </motion.h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((t, i) => (
                  <motion.div
                    key={i}
                    {...fadeUp(i * 0.08)}
                    className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
                  >
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, s) => (
                        <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.body}"</p>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-extrabold shrink-0`}>
                        {t.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-400 font-medium">{t.title}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>


        </main>

        {/* ── Footer ─-----─ */}
        <footer className="bg-white border-t border-gray-100 text-gray-500">
          <div className="container mx-auto px-6 max-w-7xl py-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-gray-100">
              {/* Brand */}
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="flex items-center gap-2 mb-4">
                  <Image src="/logo.png" alt="Dineflow Icon" width={32} height={32} className="h-8 w-8 object-contain" priority />
                  <strong className="text-lg font-extrabold tracking-tight text-gray-900">Dineflow</strong>
                </Link>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[220px]">
                  The all-in-one restaurant management platform built for modern India.
                </p>
                <div className="-mb-8">
                  <a href="https://www.foundrlist.com/product/dineflow" target="_blank" rel="nofollow noopener noreferrer">
                    <img src="https://www.foundrlist.com/api/badge/dineflow" alt="Live on FoundrList" width="160" height="64" />
                  </a>
                </div>
              </div>

              {/* Product */}
              <div>
                <h4 className="text-gray-900 font-bold text-sm mb-4">Product</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-[#0f9d6a] transition-colors">Features</Link></li>
                  <li><Link href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-[#0f9d6a] transition-colors">Pricing</Link></li>
                  <li><Link href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-[#0f9d6a] transition-colors">How It Works</Link></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-gray-900 font-bold text-sm mb-4">Company</h4>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="#" className="hover:text-[#0f9d6a] transition-colors">About</Link></li>
                  <li><Link href="#" className="hover:text-[#0f9d6a] transition-colors">Blog</Link></li>
                  <li><Link href="#" className="hover:text-[#0f9d6a] transition-colors">Contact</Link></li>
                </ul>
              </div>

              {/* Socials */}
              <div>
                <h4 className="text-gray-900 font-bold text-sm mb-4">Follow Us</h4>
                <div className="flex gap-3">
                  {[
                    { Icon: Twitter, href: "#" },
                    { Icon: Instagram, href: "#" },
                    { Icon: Linkedin, href: "#" },
                  ].map(({ Icon, href }, i) => (
                    <Link key={i} href={href} className="h-9 w-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-emerald-100 hover:text-[#0f9d6a] transition-all">
                      <Icon className="h-4 w-4" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
              <strong>© {new Date().getFullYear()} DINEFLOW TECHNOLOGIES PRIVATE LIMITED . All rights reserved.</strong>
              <div className="flex gap-6">
                <Link href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </HomeScroll>
  );
}
