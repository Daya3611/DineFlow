"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2, Sparkles, Zap, ShieldCheck, Play } from "lucide-react";
import { toast } from "@/lib/toast";
import { db } from "@/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import Script from "next/script";

const plans = [
  {
    id: "basic",
    name: "Basic Plan",
    price: 299,
    features: ["Up to 10 Tables", "Up to 50 Menu Items", "Basic Analytics", "QR Code Generation", "Standard Support"],
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: 499,
    features: ["Up to 25 Tables", "Unlimited Menu Items", "Advanced Analytics", "Priority Support", "Custom Branding"],
  },
  {
    id: "premium",
    name: "DineFlow Premium",
    price: 999,
    features: ["Up to 100 Tables", "Unlimited Menu Items", "Full Analytics Dashboard", "Multi Outlet Support", "Custom Branding", "Dedicated Support"],
  }
];

export default function SubscriptionPage() {
  const { user, restaurant, setRestaurant } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, price: number) => {
    if (!user || !restaurant) {
      toast.error("Please complete your restaurant setup first.");
      return;
    }

    setLoadingPlan(planId);

    try {
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price, plan: planId }),
      });

      if (!response.ok) throw new Error("Failed to create order");

      const order = await response.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Dineflow.pro",
        description: `Subscription for ${planId} plan`,
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

            // Logic for calculating expiry based on plan
            const isTrial = planId === "trial";
            const days = isTrial ? 1 : 30;
            const expiryDate = Date.now() + days * 24 * 60 * 60 * 1000;
            const startDate = Date.now();

            const subscriptionId = `sub_${response.razorpay_payment_id}`;
            await setDoc(doc(db, "subscriptions", subscriptionId), {
              id: subscriptionId,
              userId: user.uid,
              plan: planId,
              status: "active",
              razorpayPaymentId: response.razorpay_payment_id,
              startDate,
              expiryDate,
              createdAt: Date.now(),
            });

            await updateDoc(doc(db, "users", user.uid), { subscriptionId });
            await updateDoc(doc(db, "restaurants", restaurant.id), {
              subscriptionStatus: "active",
              plan: planId,
            });

            // @ts-expect-error Ignoring type mismatch for plan update
            setRestaurant({ ...restaurant, plan: planId, subscriptionStatus: "active" });

            toast.success("Subscription activated successfully!");
            window.location.href = "/restaurant/dashboard"; // Force reload to re-run layout checks
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
      <div className="max-w-6xl mx-auto space-y-8 pb-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Pricing that scales with you</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Current Plan: <span className="font-semibold text-[#0f9d6a] capitalize">{restaurant?.plan || "None"}</span>
          </p>
        </div>

        {/* Trial Banner */}
        {restaurant?.plan !== "trial" && restaurant?.plan !== "pro" && restaurant?.plan !== "premium" && restaurant?.plan !== "basic" && (
          <div className="bg-gradient-to-r from-teal-500 to-[#0f9d6a] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-lg text-white mb-10">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <Sparkles className="h-6 w-6 text-yellow-300" />
                Try everything for ₹1
              </h2>
              <p className="text-teal-50 opacity-90 max-w-lg">
                Get full access to all features for 24 hours. See how Dineflow.pro can transform your restaurant.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-white text-[#0f9d6a] hover:bg-slate-100 font-bold whitespace-nowrap rounded-xl shadow-sm px-8"
              onClick={() => handleSubscribe("trial", 1)}
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

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start pt-6 lg:pt-8">
          {plans.map((plan) => {
            const isCurrentPlan = restaurant?.plan === plan.id;
            const isPro = plan.id === "pro";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col bg-white rounded-2xl transition-all duration-300 overflow-visible ${
                  isPro 
                    ? "border-[3px] border-[#0f9d6a] shadow-[0_0_25px_rgba(15,157,106,0.25)] z-10 lg:scale-105" 
                    : "border border-slate-200 shadow-sm hover:shadow-md"
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 bg-[#0f9d6a] text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-md">
                    <Zap className="h-3.5 w-3.5 fill-current" /> Most Popular
                  </div>
                )}
                
                <CardHeader className={`text-center pb-6 pt-8 ${isPro ? "px-6" : "px-6"}`}>
                  <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                  <CardDescription className="mt-4 flex flex-col items-center">
                    <div className="flex items-baseline text-slate-900">
                      <span className={`text-5xl font-extrabold ${isPro ? "text-[#0f9d6a]" : ""}`}>₹{plan.price}</span>
                      <span className="text-lg text-slate-500 font-medium ml-1">/month</span>
                    </div>
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
                    className={`w-full rounded-xl font-bold text-base h-14 transition-all duration-200 ${
                      isCurrentPlan
                        ? "bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-100"
                        : isPro
                        ? "bg-[#0f9d6a] text-white hover:bg-[#0c7f56] shadow-md hover:shadow-lg shadow-[#0f9d6a]/30"
                        : "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
                    }`}
                    disabled={isCurrentPlan || loadingPlan !== null}
                    onClick={() => handleSubscribe(plan.id, plan.price)}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      "Subscribe Now"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
