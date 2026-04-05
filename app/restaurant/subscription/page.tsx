"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2, Sparkles, Zap, Play } from "lucide-react";
import { toast } from "@/lib/toast";
import { db } from "@/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import Script from "next/script";

const plans = [
  {
    id: "basic",
    name: "Basic Plan",
    monthlyPrice: 499,
    yearlyPrice: 4999,
    setupFee: 2999,
    features: ["Up to 10 tables", "Up to 50 menu items", "QR code ordering", "Basic analytics", "Standard support"],
    tableLimit: 10,
    menuLimit: 50,
    supportType: "standard",
  },
  {
    id: "pro",
    name: "Pro Plan",
    monthlyPrice: 999,
    yearlyPrice: 9999,
    setupFee: 4999,
    features: ["Up to 25 tables", "Unlimited menu items", "Advanced analytics", "Priority support", "Custom branding"],
    tableLimit: 25,
    menuLimit: 999999,
    supportType: "priority",
  },
  {
    id: "premium",
    name: "Premium Plan",
    monthlyPrice: 1999,
    yearlyPrice: 19999,
    setupFee: 7999,
    features: ["Up to 100 tables", "Full analytics dashboard", "Multi-outlet support", "Custom branding", "Dedicated support"],
    tableLimit: 100,
    menuLimit: 999999,
    supportType: "dedicated",
  }
];

const lifetimePlan = {
  id: "lifetime",
  name: "Lifetime Plan",
  price: 24999,
  setupFee: 0,
  features: ["Core features only", "No free future updates", "Limited support (6 months)", "Paid upgrades required"],
  tableLimit: 50,
  menuLimit: 999999,
  supportType: "limited",
};

export default function SubscriptionPage() {
  const { user, restaurant, setRestaurant } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [showLifetime, setShowLifetime] = useState(false);

  const handleSubscribe = async (planData: any, cycle: "monthly" | "yearly" | "lifetime") => {
    if (!user || !restaurant) {
      toast.error("Please complete your restaurant setup first.");
      return;
    }

    setLoadingPlan(planData.id);

    try {
      let finalAmount = 0;
      let setupFee = 0;

      if (cycle === "monthly") {
        finalAmount = planData.monthlyPrice + planData.setupFee;
        setupFee = planData.setupFee;
      } else if (cycle === "yearly") {
        finalAmount = planData.yearlyPrice;
        setupFee = 0; // No setup fee for yearly
      } else if (cycle === "lifetime") {
        finalAmount = planData.price;
        setupFee = 0;
      } else if (cycle === ("trial" as any)) {
        finalAmount = 1;
        setupFee = 0;
      }

      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, plan: planData.id }),
      });

      if (!response.ok) throw new Error("Failed to create order");

      const order = await response.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "DineFlow",
        description: `Subscription for ${planData.name} (${cycle})`,
        order_id: order.id,
        handler: async function (response: Record<string, string>) {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) throw new Error("Payment verification failed");

            let days = 30;
            if (cycle === "monthly") days = 30;
            else if (cycle === "yearly") days = 365;
            else if (cycle === "lifetime") days = 36500; // 100 years
            else if (planData.id === "trial") days = 1;

            const expiryDate = Date.now() + days * 24 * 60 * 60 * 1000;
            const startDate = Date.now();

            const subscriptionId = `sub_${response.razorpay_payment_id}`;
            await setDoc(doc(db, "subscriptions", subscriptionId), {
              id: subscriptionId,
              userId: user.uid,
              plan: planData.id,
              billingCycle: cycle,
              setupFee,
              status: "active",
              razorpayPaymentId: response.razorpay_payment_id,
              startDate,
              expiryDate,
              features: planData?.features || [],
              tableLimit: planData?.tableLimit || 10,
              menuLimit: planData?.menuLimit || 50,
              supportType: planData?.supportType || "standard",
              createdAt: Date.now(),
            });

            await updateDoc(doc(db, "users", user.uid), { subscriptionId });
            await updateDoc(doc(db, "restaurants", restaurant.id), {
              subscriptionStatus: "active",
              plan: planData.id,
            });
            setRestaurant({ ...restaurant, plan: planData.id, subscriptionStatus: "active" });

            toast.success("Subscription activated successfully!");
            window.location.href = "/restaurant/dashboard";
          } catch (error) {
            toast.error("Error confirming payment.");
          }
        },
        prefill: {
          name: user?.displayName || restaurant.name,
          email: user?.email,
        },
        theme: {
          color: "#0f9d6a",
        },
      };

      // @ts-expect-error Window razorpay property
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: Record<string, any>) {
        toast.error(response.error.description);
      });
      razorpay.open();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Something went wrong.");
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="max-w-6xl mx-auto space-y-8 pb-10 px-4 md:px-0">
        <div className="text-center mb-10 pt-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Pricing that scales with you</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-8">
            Current Plan: <span className="font-semibold text-[#0f9d6a] capitalize">{restaurant?.plan || "None"}</span>
          </p>

          {!showLifetime && (
            <div className="flex justify-center items-center gap-4 bg-slate-100/50 p-2 rounded-full inline-flex mx-auto border border-slate-200 mb-6">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === "yearly" ? "bg-[#0f9d6a] shadow-sm text-white" : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                Yearly <span className={billingCycle === "yearly" ? "text-green-200" : "text-[#0f9d6a]"}>Save 20%</span>
              </button>
            </div>
          )}
        </div>

        {/* Trial Banner */}
        {(restaurant?.plan as string) !== "trial" && (restaurant?.plan as string) !== "pro" && (restaurant?.plan as string) !== "premium" && (restaurant?.plan as string) !== "basic" && (restaurant?.plan as string) !== "lifetime" && (
          <div className="bg-gradient-to-r from-teal-500 to-[#0f9d6a] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-lg text-white mb-10">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <Sparkles className="h-6 w-6 text-yellow-300" />
                Try everything for ₹1
              </h2>
              <p className="text-teal-50 opacity-90 max-w-lg">
                Get full access to all features for 24 hours. See how DineFlow can transform your restaurant.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-white text-[#0f9d6a] hover:bg-slate-100 font-bold whitespace-nowrap rounded-xl shadow-sm px-8"
              onClick={() => handleSubscribe({ id: "trial", name: "1 Day Trial" }, "trial" as any)}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "trial" ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#0f9d6a]" />
              ) : (
                <>Start ₹1 Trial <Play className="ml-2 h-4 w-4 fill-current" /></>
              )}
            </Button>
          </div>
        )}

        {showLifetime ? (
          <div className="max-w-md mx-auto">
            <Card className="relative flex flex-col bg-slate-900 border-0 rounded-2xl shadow-xl overflow-hidden text-white">
              <CardHeader className="text-center pb-6 pt-8 px-6">
                <CardTitle className="text-2xl font-bold">{lifetimePlan.name}</CardTitle>
                <CardDescription className="mt-4 flex flex-col items-center">
                  <div className="flex items-baseline text-white">
                    <span className="text-5xl font-extrabold">₹{lifetimePlan.price}</span>
                    <span className="text-lg text-slate-400 font-medium ml-1">/one-time</span>
                  </div>
                  <span className="text-sm font-medium text-emerald-400 mt-2 bg-emerald-400/10 px-3 py-1 rounded-full">
                    No Setup Fee
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 px-6">
                <div className="h-px w-full bg-slate-700 mb-6" />
                <ul className="space-y-4">
                  {lifetimePlan.features.map((feature, i) => (
                    <li key={i} className="flex text-slate-300">
                      <Check className="h-5 w-5 mr-3 shrink-0 text-amber-500" />
                      <span className="font-medium text-[15px]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-6 pb-8 px-6">
                <Button
                  className="w-full rounded-xl font-bold text-base h-14 transition-all duration-200 bg-white text-slate-900 hover:bg-slate-200 shadow-md"
                  disabled={loadingPlan !== null}
                  onClick={() => handleSubscribe(lifetimePlan, "lifetime")}
                >
                  {loadingPlan === lifetimePlan.id ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "Buy Once"}
                </Button>
              </CardFooter>
            </Card>
            <div className="text-center mt-6">
              <button
                onClick={() => setShowLifetime(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← Back to regular plans
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start pt-2">
              {plans.map((plan) => {
                const isCurrentPlan = restaurant?.plan === plan.id;
                const isPro = plan.id === "pro";
                const displayPrice = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
                const ctaText = billingCycle === "yearly" ? "Save & Subscribe" : "Get Started";

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col bg-white rounded-2xl transition-all duration-300 overflow-visible ${isPro
                      ? "border-[3px] border-[#0f9d6a] shadow-[0_0_25px_rgba(15,157,106,0.25)] z-10 lg:-translate-y-4 lg:scale-105"
                      : "border border-slate-200 shadow-sm hover:shadow-md"
                      }`}
                  >
                    {isPro && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 bg-[#0f9d6a] text-white text-[12px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-md">
                        <Zap className="h-3.5 w-3.5 fill-current" /> Most Popular
                      </div>
                    )}

                    <CardHeader className={`text-center pb-6 pt-8 px-6`}>
                      <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                      {isPro && <p className="text-xs font-semibold text-emerald-600 mt-1">Perfect for most restaurants</p>}
                      <CardDescription className="mt-4 flex flex-col items-center">
                        <div className="flex items-baseline text-slate-900">
                          <span className={`text-5xl font-extrabold ${isPro ? "text-[#0f9d6a]" : ""}`}>₹{displayPrice}</span>
                          <span className="text-lg text-slate-500 font-medium ml-1">/{billingCycle === "yearly" ? "year" : "month"}</span>
                        </div>
                        {billingCycle === "monthly" ? (
                          <span className="text-sm font-medium text-slate-500 mt-2">
                            + ₹{plan.setupFee} setup fee
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-emerald-600 mt-2 bg-emerald-50 px-3 py-1 rounded-full">
                            ₹0 Setup Fee
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 px-6">
                      <div className="h-px w-full bg-slate-100 mb-6" />
                      <ul className="space-y-4">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex text-slate-700">
                            <Check className={`h-5 w-5 mr-3 shrink-0 ${isPro ? "text-[#0f9d6a]" : "text-emerald-500"}`} />
                            <span className="font-medium text-[15px]">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-6 pb-8 px-6">
                      <Button
                        className={`w-full rounded-xl font-bold text-base h-14 transition-all duration-200 ${isCurrentPlan
                          ? "bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-100"
                          : isPro
                            ? "bg-[#0f9d6a] text-white hover:bg-[#0c7f56] shadow-md hover:shadow-lg shadow-[#0f9d6a]/30"
                            : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                          }`}
                        disabled={isCurrentPlan || loadingPlan !== null}
                        onClick={() => handleSubscribe(plan, billingCycle)}
                      >
                        {loadingPlan === plan.id ? (
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        ) : isCurrentPlan ? (
                          "Current Plan"
                        ) : (
                          ctaText
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mt-12 mb-8">
              <button
                onClick={() => setShowLifetime(true)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
              >
                Looking for a one-time payment option?
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
