"use client"

import { usePathname, useRouter } from "next/navigation"
import { Home, ClipboardList } from "lucide-react"

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    {
      label: "Menu",
      icon: Home,
      path: "/menu",
    },
    {
      label: "Orders",
      icon: ClipboardList,
      path: "/orders",
    },
  ]

  // Only show this on mobile (already handled by md:hidden)
  return (
    <div className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-gray-200 md:hidden pb-safe">
      <div className="flex justify-around items-center py-2 px-4 h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path
          const Icon = tab.icon

          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
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
            </button>
          )
        })}
      </div>
    </div>
  )
}
