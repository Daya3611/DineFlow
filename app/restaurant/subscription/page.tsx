"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import Script from "next/script";

const plans = [
  {
    id: "basic",
    name: "Basic Plan",
    price: 199,
    features: ["Up to 50 Menu Items", "Basic Analytics", "Standard Support", "QR Code Generation"],
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: 499,
    features: ["Unlimited Menu Items", "Advanced Analytics", "Priority Support", "Custom Branding", "Multiple Outlets"],
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
      // Create Razorpay order
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
        name: "DineFlow.pro",
        description: `Subscription for ${planId} plan`,
        order_id: order.id,
        handler: async function (response: Record<string, string>) {
          try {
            // Verify signature
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

            // Update user subscription in firestore
            const expiryDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // +30 days

            const subscriptionId = `sub_${response.razorpay_payment_id}`;
            await setDoc(doc(db, "subscriptions", subscriptionId), {
              id: subscriptionId,
              userId: user.uid,
              plan: planId,
              status: "active",
              razorpayPaymentId: response.razorpay_payment_id,
              expiryDate,
              createdAt: Date.now(),
            });

            // Update User & Restaurant references
            await updateDoc(doc(db, "users", user.uid), { subscriptionId });
            await updateDoc(doc(db, "restaurants", restaurant.id), {
              subscriptionStatus: "active",
              plan: planId,
            });

            // @ts-expect-error Ignoring type mismatch for plan update
            setRestaurant({ ...restaurant, plan: planId, subscriptionStatus: "active" });

            toast.success("Subscription activated successfully!");
          } catch (error) {
            toast.error("Error confirming payment.");
          }
        },
        prefill: {
          name: user?.displayName || restaurant.name,
          email: user?.email,
        },
        theme: {
          color: "#4f46e5",
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
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Choose the perfect plan</h1>
          <p className="mt-4 text-lg text-slate-500">
            Current Plan: <span className="font-semibold text-indigo-600 capitalize">{restaurant?.plan || "None"}</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = restaurant?.plan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col border-2 ${plan.id === "pro" ? "border-indigo-600 shadow-xl shadow-indigo-100" : "border-slate-200"
                  }`}
              >
                {plan.id === "pro" && (
                  <div className="absolute -top-4 left-0 right-0 mx-auto w-max px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-500 mt-2">
                    <span className="text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
                    <span className="text-base"> /month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 mt-6">
                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-slate-700">
                        <Check className="h-5 w-5 text-indigo-500 mr-3 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Button
                    className={`w-full rounded-full font-medium h-12 transition duration-200 ${isCurrentPlan
                      ? "bg-white border border-slate-200 text-slate-400 cursor-default"
                      : "bg-[#0f9d6a] text-white hover:bg-[#0c7f56] focus:ring-2 focus:ring-[#0f9d6a]/30"
                      }`}
                    size="lg"
                    disabled={isCurrentPlan || loadingPlan !== null}
                    onClick={() => handleSubscribe(plan.id, plan.price)}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : isCurrentPlan ? (
                      "Current Plan"
                    ) : (
                      "Subscribe"
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
