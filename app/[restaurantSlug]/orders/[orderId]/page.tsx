"use client";

import { use } from "react";
import OrderTrackingScreen from "@/components/customer/OrderTrackingScreen";
import { useRouter } from "next/navigation";

export default function OrderTrackingRoutePage(props: { params: Promise<{ restaurantSlug: string, orderId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  
  let slug = params.restaurantSlug;
  if (slug.startsWith('%40')) slug = slug.substring(3);
  else if (slug.startsWith('@')) slug = slug.substring(1);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 relative pb-[70px]">
       <OrderTrackingScreen 
          orderId={params.orderId} 
          table="Takeaway"
          onOrderAgain={() => router.push(`/@${slug}/takeaway`)}
          onViewMenu={() => router.push(`/@${slug}/takeaway`)}
       />
    </div>
  );
}
