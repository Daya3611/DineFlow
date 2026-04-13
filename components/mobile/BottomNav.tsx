"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Home, ClipboardList } from "lucide-react"
import { Suspense } from "react"
import { Button } from "@/components/ui/button";

function BottomNavContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const isCustomerPage = pathname.startsWith("/menu") || pathname.startsWith("/orders")
  if (!isCustomerPage) return null;

  const queryString = searchParams.toString()
  const suffix = queryString ? `?${queryString}` : ""

  const tabs = [
    {
      label: "Menu",
      icon: Home,
      path: `/menu${suffix}`,
      basePath: "/menu"
    },
    {
      label: "Orders",
      icon: ClipboardList,
      path: `/orders${suffix}`,
      basePath: "/orders"
    },
  ]

  // Only show this on mobile (already handled by md:hidden)
  return (
    <div className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-gray-200 md:hidden pb-safe">
      <div className="flex justify-around items-center py-2 px-4 h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.basePath
          const Icon = tab.icon

          return (
            <Button key={tab.basePath} onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-95 ${
                isActive
                  ? "text-[#0f9d6a]"
                  : "text-gray-400"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? "scale-110" : ""
                }`}
              />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-[#0f9d6a]" : "text-gray-400"}`}>
                {tab.label}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  )
}
