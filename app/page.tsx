"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
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
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const features = [
  {
    title: "QR Ordering",
    icon: QrCode,
    color: "bg-emerald-100 text-emerald-600",
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
    body: "DineFlow completely transformed how we handle orders. Our staff is faster and customers love scanning QR codes.",
    avatar: "RM",
    color: "bg-emerald-600",
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
    desc: "For growing restaurants that need the full DineFlow experience.",
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
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, delay },
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white font-sans antialiased">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto px-6 max-w-7xl h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
              <ChefHat className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-lg text-gray-900 tracking-tight">DineFlow</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <Link href="#features" className="hover:text-emerald-600 transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-emerald-600 transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-emerald-600 font-semibold hidden sm:flex">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm shadow-emerald-200 rounded-xl px-5 transition-all hover:scale-[1.03]">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
          {/* Background blobs */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#ECFDF5] via-white to-white" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-emerald-300/20 rounded-full blur-3xl -z-10" />

          <div className="container mx-auto px-6 max-w-5xl text-center">

            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full border border-emerald-200 mb-8 shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Trusted by 500+ restaurants across India
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="text-5xl sm:text-6xl md:text-[4.5rem] font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.08]"
            >
              The smarter way to{" "}
              <br className="hidden sm:block" />
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
                  run your restaurant
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 10" fill="none">
                  <path d="M2 8 Q150 2 298 8" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.55" />
                </svg>
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              QR-based ordering, real-time kitchen tracking, smart billing, and powerful analytics — all in one platform built for modern Indian restaurants.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
            >
              <Link href="/register">
                <Button size="lg" className="h-14 px-10 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xl shadow-emerald-200/70 rounded-2xl transition-all hover:scale-105 hover:-translate-y-0.5">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="h-14 px-10 text-base border-gray-200 text-gray-700 rounded-2xl hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 font-semibold transition-all">
                  See How It Works
                </Button>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="text-sm text-gray-400 font-medium mb-16"
            >
              No credit card required &nbsp;·&nbsp; Setup in 2 minutes &nbsp;·&nbsp; Cancel anytime
            </motion.p>

            {/* Dashboard preview */}
            <motion.div
              initial={{ opacity: 0, y: 48, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
              className="relative mx-auto max-w-5xl"
            >
              <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 shadow-2xl shadow-gray-300/40 ring-1 ring-gray-100">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/20 pointer-events-none z-10 rounded-2xl" />
                <Image
                  src="/hero.png"
                  alt="DineFlow dashboard preview"
                  width={1280}
                  height={720}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
              {/* Glow under image */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-emerald-400/20 blur-3xl rounded-full -z-10" />
            </motion.div>
          </div>
        </section>

        {/* ── Social proof stats ── */}
        <section className="py-14 border-y border-gray-100 bg-gray-50/50">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-gray-200">
              {stats.map((s, i) => (
                <motion.div key={i} {...fadeUp(i * 0.08)} className="text-center md:px-6">
                  <div className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">{s.value}</div>
                  <div className="text-sm text-gray-500 font-medium">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="py-24 bg-white">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <motion.div {...fadeUp(0)} className="inline-flex items-center text-emerald-700 font-semibold text-sm bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 mb-4">
                Powerful features
              </motion.div>
              <motion.h2 {...fadeUp(0.08)} className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-5">
                Everything you need to<br />run your restaurant
              </motion.h2>
              <motion.p {...fadeUp(0.14)} className="text-gray-500 text-lg max-w-xl mx-auto">
                Every feature is crafted to save time, reduce errors, and delight your customers.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={i}
                    {...fadeUp(i * 0.07)}
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
            </div>
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

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />

              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div key={i} {...fadeUp(i * 0.1)} className="text-center relative">
                    <div className="relative inline-flex items-center justify-center mb-6 pt-3 pr-3">
                      <div className="h-20 w-20 rounded-full bg-white border-2 border-emerald-100 shadow-lg shadow-emerald-100/40 flex items-center justify-center z-10 relative">
                        <Icon className="h-8 w-8 text-emerald-600" />
                      </div>
                      <span className="absolute top-0 right-0 text-[10px] font-black bg-emerald-600 text-white rounded-full h-6 w-6 flex items-center justify-center shadow-md z-20">
                        {s.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 mb-3">{s.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-24 bg-white">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="text-center mb-16">
              <motion.div {...fadeUp(0)} className="inline-flex items-center text-emerald-700 font-semibold text-sm bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 mb-4">
                Simple pricing
              </motion.div>
              <motion.h2 {...fadeUp(0.07)} className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                Pay only for what you need
              </motion.h2>
              <motion.p {...fadeUp(0.13)} className="text-gray-500 text-lg max-w-md mx-auto">
                No hidden fees. Cancel anytime. Start free for 14 days.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {plans.map((plan, i) => (
                <motion.div
                  key={i}
                  {...fadeUp(i * 0.1)}
                  className={`relative rounded-2xl p-8 flex flex-col border-2 transition-all ${plan.highlighted
                      ? "border-emerald-500 bg-emerald-600 text-white shadow-2xl shadow-emerald-200 scale-[1.02]"
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
                    <Button
                      size="lg"
                      className={`w-full font-bold rounded-xl h-12 transition-all hover:scale-[1.02] ${plan.highlighted
                          ? "bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100"
                        }`}
                    >
                      {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-24 bg-[#F9FAFB]">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <motion.div {...fadeUp(0)} className="inline-flex items-center text-emerald-700 font-semibold text-sm bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 mb-4">
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

        {/* ── Final CTA Banner ── */}
        <section className="py-24 bg-gradient-to-br from-emerald-600 to-teal-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.08]">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl" />
          </div>
          <div className="container mx-auto px-6 max-w-3xl text-center relative z-10">
            <motion.h2 {...fadeUp(0)} className="text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">
              Ready to modernize your restaurant?
            </motion.h2>
            <motion.p {...fadeUp(0.08)} className="text-emerald-100 text-lg mb-10 max-w-xl mx-auto">
              Join 500+ restaurants using DineFlow to serve customers faster, smarter, and without paper menus.
            </motion.p>
            <motion.div {...fadeUp(0.14)} className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-10 h-14 text-base rounded-2xl shadow-xl transition-all hover:scale-105">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
            <motion.p {...fadeUp(0.2)} className="text-emerald-200/70 text-sm mt-5">
              No credit card required &nbsp;·&nbsp; 14-day free trial
            </motion.p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-100 text-gray-500">
        <div className="container mx-auto px-6 max-w-7xl py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-gray-100">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-200">
                  <ChefHat className="h-4 w-4 text-white" />
                </div>
                <span className="font-extrabold text-lg text-gray-900 tracking-tight">DineFlow</span>
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[220px]">
                The all-in-one restaurant management platform built for modern India.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-gray-900 font-bold text-sm mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="#features" className="hover:text-emerald-600 transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link></li>
                <li><Link href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-gray-900 font-bold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="#" className="hover:text-emerald-600 transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-emerald-600 transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-emerald-600 transition-colors">Contact</Link></li>
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
                  <Link key={i} href={href} className="h-9 w-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-600 transition-all">
                    <Icon className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} DineFlow. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
