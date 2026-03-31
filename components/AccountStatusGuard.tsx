"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";

function GuardInner({ children }: { children: React.ReactNode }) {
  const { restaurant: authRestaurant } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // 1. Determine the restaurantId to check
    let restaurantId = authRestaurant?.id;

    if (!restaurantId && pathname?.startsWith("/menu")) {
      restaurantId = searchParams?.get("restaurantId") || undefined;
    }

    if (!restaurantId) {
      setStatus(null);
      return;
    }

    // 2. Listen to real-time status
    const unsubscribe = onSnapshot(doc(db, "restaurants", restaurantId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.subscriptionStatus === "inactive" || data.status === "inactive" ? "inactive" : "active");
      }
    });

    return () => unsubscribe();
  }, [authRestaurant?.id, searchParams, pathname]);

  if (status === "inactive") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-center max-w-md w-full border border-gray-100 flex flex-col items-center">
          <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-3 text-center">
            Account Deactivated
          </h2>
          <p className="text-gray-600 mb-8 text-[15px] leading-relaxed">
            Your account has been deactivated by the administrator. Please contact support to reactivate your account.
          </p>
          <a href="mailto:support@dineflow.pro" className="w-full">
            <button className="w-full bg-[#0f9d6a] hover:bg-[#0c8a5c] text-white px-6 py-3.5 rounded-xl font-bold transition-all shadow-sm hover:shadow-md active:scale-[0.98] text-[15px]">
              Contact Support
            </button>
          </a>
          <div className="mt-4">
            <button 
              onClick={async () => {
                const { auth } = await import("@/firebase");
                const { signOut } = await import("firebase/auth");
                await signOut(auth);
                window.location.href = "/login";
              }}
              className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AccountStatusGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Do not block the super admin dashboard or public unauthenticated pages that don't need a wrapper check.
  // We only really care about blocking restaurant owner pages and menu pages.
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <GuardInner>{children}</GuardInner>
    </Suspense>
  );
}
