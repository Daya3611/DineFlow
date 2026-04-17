"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2, Sparkles, Zap, Play } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/firebase";
import { doc, updateDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import Script from "next/script";

import { plans, lifetimePlan } from "@/lib/plans";

export default function SubscriptionPage() {
  const { user, userData, restaurant, setRestaurant, subscription } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [showLifetime, setShowLifetime] = useState(false);
  const [dbPlans, setDbPlans] = useState<any[]>(plans);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const snap = await getDocs(query(collection(db, "plans"), where("isActive", "==", true)));
        if (!snap.empty) {
          const fetchedPlans = snap.docs.map(doc => doc.data());
          setDbPlans(fetchedPlans.sort((a, b) => (a.order || 0) - (b.order || 0)));
        }
      } catch (e) {
        console.error("Failed to fetch DB plans, using local fallback", e);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (planData: any, cycle: "monthly" | "yearly" | "lifetime") => {
    if (!user || !restaurant) {
      toast.error("Please complete your restaurant setup first.");
      return;
    }

    setLoadingPlan(planData.id);

    try {
      const isSamePlan = restaurant.plan === planData.id;
      const daysLeft = subscription?.expiryDate ? Math.ceil((subscription.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

      if (isSamePlan && subscription?.status === "active") {
        if (daysLeft > 3) {
          toast.error("Renewal allowed only in the last 3 days.");
          setLoadingPlan(null);
          return;
        }
      }

      const hasPaidSetupFee = userData?.setupFeePaid || restaurant.setupFeePaid === true;

      const calculateAmount = () => {
        if (cycle === "yearly") return planData.priceYearly;
        if (cycle === "lifetime") return planData.price;
        if (cycle === ("trial" as any)) return 49;

        if (!hasPaidSetupFee) return planData.priceMonthly + planData.setupFee;
        return planData.priceMonthly;
      };

      const finalAmount = calculateAmount();
      const setupFeeCharged = (cycle === "monthly" && !hasPaidSetupFee) ? planData.setupFee : 0;

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
            else if (planData.id === "trial") days = 7;

            const expiryDate = Date.now() + days * 24 * 60 * 60 * 1000;
            const startDate = Date.now();

            const subscriptionId = `sub_${response.razorpay_payment_id}`;
            await setDoc(doc(db, "subscriptions", subscriptionId), {
              id: subscriptionId,
              userId: user.uid,
              plan: planData.id,
              billingCycle: cycle,
              setupFee: setupFeeCharged,
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

            const newSetupFeePaid = hasPaidSetupFee || setupFeeCharged > 0;

            await updateDoc(doc(db, "users", user.uid), { subscriptionId, setupFeePaid: newSetupFeePaid });
            await updateDoc(doc(db, "restaurants", restaurant.id), {
              subscriptionStatus: "active",
              plan: planData.id,
              setupFeePaid: newSetupFeePaid
            });
            setRestaurant({ ...restaurant, plan: planData.id, subscriptionStatus: "active", setupFeePaid: newSetupFeePaid });

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
        <div className="text-center mb-17 pt-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Pricing that scales with you</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-8">
            Current Plan: <span className="font-semibold text-[#0f9d6a] capitalize">{restaurant?.plan || "None"}</span>
          </p>

          {!showLifetime && (
            <div className="flex justify-center mb-8">
              <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200 shadow-sm">

                {/* Monthly */}
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`relative px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200
      ${billingCycle === "monthly"
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  Monthly
                </button>

                {/* Yearly */}
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`relative px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2
      ${billingCycle === "yearly"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  Yearly

                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap
        ${billingCycle === "yearly"
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-600"
                      }`}
                  >
                    Save 20%
                  </span>
                </button>

              </div>
            </div>
          )}
        </div>

        {/* Trial Banner */}
        {(restaurant?.plan as string) !== "trial" && (restaurant?.plan as string) !== "pro" && (restaurant?.plan as string) !== "premium" && (restaurant?.plan as string) !== "basic" && (restaurant?.plan as string) !== "lifetime" && (
          <div className="bg-gradient-to-r from-teal-500 to-[#0f9d6a] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between shadow-lg text-white mb-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg z-10 shadow-sm">
              🔥 Best for New Users
            </div>
            <div className="mb-4 md:mb-0 relative z-10">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <Sparkles className="h-6 w-6 text-yellow-300" />
                7 Days Trial for ₹49
              </h2>
              <p className="text-teal-50 opacity-90 max-w-lg">
                Get full access to all features for 7 days. See how DineFlow can transform your restaurant.
              </p>
            </div>
            <Button size="lg" className="text-[#0f9d6a] hover: whitespace-nowrap relative z-10" onClick={() => handleSubscribe({ id: "trial", name: "7 Day Trial", price: 49 }, "trial" as any)}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "trial" ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#0f9d6a]" />
              ) : (
                <>Start ₹49 Trial <Play className="ml-2 h-4 w-4 fill-current" /></>
              )}
            </Button>
          </div>
        )}

        {showLifetime ? (
          <div className="max-w-sm mx-auto">
            {/* Gradient border wrapper */}
            <div className="p-[2px] rounded-3xl bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-900 shadow-2xl shadow-emerald-900/30">
              <Card className="relative flex flex-col bg-emerald-950 border-0 rounded-3xl overflow-hidden text-white">
                <CardHeader className="text-center pb-4 pt-10 px-8">
                  <div className="flex justify-center mb-3">
                    <span className="inline-flex items-center gap-1.5 bg-amber-400/15 text-amber-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      <Zap className="h-3 w-3 fill-current" /> One-time Deal
                    </span>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">{lifetimePlan.name}</CardTitle>
                  <CardDescription className="mt-5 flex flex-col items-center">
                    <div className="flex items-baseline text-white">
                      <span className="text-5xl font-extrabold tracking-tight">₹{lifetimePlan.price}</span>
                      <span className="text-base text-emerald-400 font-semibold ml-2">/one-time</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400 mt-3 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full">
                      No Setup Fee · No Renewals
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 px-8 pb-2">
                  <div className="h-px w-full bg-emerald-800/60 mb-6" />
                  <ul className="space-y-3">
                    {lifetimePlan.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-emerald-100">
                        <span className="mt-0.5 mr-3 shrink-0 h-5 w-5 rounded-full bg-emerald-700/50 flex items-center justify-center">
                          <Check className="h-3 w-3 text-emerald-300" />
                        </span>
                        <span className="text-sm font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-6 pb-8 px-8">
                  <Button
                    className="w-full rounded-full font-bold text-base h-13 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/40 transition-all duration-200"
                    disabled={loadingPlan !== null}
                    onClick={() => handleSubscribe(lifetimePlan, "lifetime")}
                  >
                    {loadingPlan === lifetimePlan.id ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "Buy Once — Lifetime Access"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            <div className="text-center mt-6">
              <Button onClick={() => setShowLifetime(false)}
                className="text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors"
              >
                ← Back to regular plans
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Pricing Cards Grid ── */}
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-end pt-6">
              {dbPlans.filter(p => p.isActive).map((plan) => {
                const isSamePlan = restaurant?.plan === plan.id;
                const daysLeft = subscription?.expiryDate ? Math.ceil((subscription.expiryDate - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                const disableSamePlan = isSamePlan && subscription?.status === "active" && daysLeft > 3;

                const getButtonState = () => {
                  if (subscription?.status === "expired") {
                    return { label: "Subscribe now", disabled: false };
                  }
                  if (isSamePlan) {
                    if (subscription?.status === "active" && daysLeft > 3) {
                      return { label: "Renew in last 3 days", disabled: true };
                    } else {
                      return { label: "Renew now", disabled: false };
                    }
                  }
                  return { label: billingCycle === "yearly" ? "Save & Subscribe" : "Get Started", disabled: false };
                };

                const { label, disabled: isBtnDisabled } = getButtonState();

                const isPro = Boolean(plan.isPopular) || plan.id === "pro";
                const displayPrice = billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly;

                return isPro ? (
                  /* ── Featured (Pro) Card ── dark emerald */
                  <div key={plan.id} className="relative flex flex-col z-10 lg:-translate-y-3">
                    {/* Badge floating above card */}
                    <div className="flex justify-center mb-0">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-t-2xl uppercase tracking-widest shadow-md">
                        <Zap className="h-3 w-3 fill-current" /> Most Popular
                      </span>
                    </div>

                    {/* Gradient border wrapper */}
                    <div className="p-[2px] rounded-3xl bg-gradient-to-b from-emerald-400 to-emerald-800 shadow-2xl shadow-emerald-700/25">
                      <div className="flex flex-col bg-emerald-900 rounded-3xl overflow-hidden text-white">
                        <div className="text-center pb-4 pt-8 px-7">
                          <p className="text-lg font-semibold text-white">{plan.name}</p>
                          <p className="text-xs font-medium text-emerald-300 mt-1">Perfect for most restaurants</p>
                          <div className="mt-5 flex flex-col items-center">
                            <div className="flex items-baseline">
                              <span className="text-5xl font-extrabold tracking-tight text-white">₹{displayPrice}</span>
                              <span className="text-base text-emerald-400 font-medium ml-1.5">/{billingCycle === "yearly" ? "year" : "month"}</span>
                            </div>
                            {billingCycle === "yearly" || plan.setupFee === 0 ? (
                              <span className="text-xs font-semibold text-emerald-300 mt-2 bg-emerald-800/60 border border-emerald-700/50 px-3 py-1 rounded-full">₹0 Setup Fee</span>
                            ) : (
                              <span className="text-xs font-medium text-emerald-400 mt-2">+ ₹{plan.setupFee} setup fee</span>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 px-7 pb-2">
                          <div className="h-px w-full bg-emerald-800/70 mb-5" />
                          <ul className="space-y-3">
                            {plan.features?.map((feature: string, i: number) => (
                              <li key={i} className="flex items-start text-emerald-100">
                                <span className="mt-0.5 mr-3 shrink-0 h-5 w-5 rounded-full bg-emerald-700/60 flex items-center justify-center">
                                  <Check className="h-3 w-3 text-emerald-300" />
                                </span>
                                <span className="text-sm font-medium">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-6 pb-8 px-7">
                          <Button
                            className={`w-full rounded-full font-bold text-base h-12 transition-all duration-200 ${
                              isBtnDisabled
                                ? "bg-emerald-700 border border-emerald-600 text-emerald-300 cursor-not-allowed"
                                : "bg-white text-emerald-900 hover:bg-emerald-50 shadow-lg"
                            }`}
                            disabled={isBtnDisabled || loadingPlan !== null}
                            onClick={() => handleSubscribe(plan, billingCycle)}
                          >
                            {loadingPlan === plan.id ? (
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            ) : (
                              label
                            )}
                          </Button>
                          {disableSamePlan && (
                            <p className="text-xs text-center text-emerald-200/80 mt-3">
                              You can renew in last 3 days
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Regular Card ── */
                  <div key={plan.id} className="p-[1.5px] rounded-3xl bg-gradient-to-b from-slate-200 to-slate-100 hover:from-emerald-200 hover:to-slate-100 transition-all duration-300 shadow-sm hover:shadow-md">
                    <div className="flex flex-col bg-white rounded-3xl overflow-hidden h-full">
                      <div className="text-center pb-4 pt-8 px-7">
                        <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                        <p className="text-xs font-medium text-slate-400 mt-1">&nbsp;</p>
                        <div className="mt-5 flex flex-col items-center">
                          <div className="flex items-baseline">
                            <span className="text-5xl font-extrabold tracking-tight text-slate-900">₹{displayPrice}</span>
                            <span className="text-base text-slate-500 font-medium ml-1.5">/{billingCycle === "yearly" ? "year" : "month"}</span>
                          </div>
                          {billingCycle === "yearly" || plan.setupFee === 0 ? (
                            <span className="text-xs font-semibold text-emerald-600 mt-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">₹0 Setup Fee</span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400 mt-2">+ ₹{plan.setupFee} setup fee</span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 px-7 pb-2">
                        <div className="h-px w-full bg-slate-100 mb-5" />
                        <ul className="space-y-3">
                          {plan.features?.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start text-slate-700">
                              <span className="mt-0.5 mr-3 shrink-0 h-5 w-5 rounded-full bg-emerald-50 flex items-center justify-center">
                                <Check className="h-3 w-3 text-emerald-500" />
                              </span>
                              <span className="text-sm font-medium">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-6 pb-8 px-7">
                        <Button
                          className={`w-full rounded-full font-semibold text-base h-12 transition-all duration-200 ${
                            isBtnDisabled
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg"
                          }`}
                          disabled={isBtnDisabled || loadingPlan !== null}
                          onClick={() => handleSubscribe(plan, billingCycle)}
                        >
                          {loadingPlan === plan.id ? (
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          ) : (
                            label
                          )}
                        </Button>
                        {disableSamePlan && (
                          <p className="text-xs text-center text-slate-500 mt-3">
                            You can renew in last 3 days
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-12 mb-8">
              <Button onClick={() => setShowLifetime(true)}
                className="text-xs font-semibold text-slate-400 hover:text-green-600 transition-colors border-none uppercase tracking-wider"
              >
                Looking for a one-time payment option?
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
