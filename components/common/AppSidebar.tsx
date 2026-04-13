"use client";

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Utensils,
  QrCode,
  ClipboardList,
  CreditCard,
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"

const platformItems = [
  { href: "/restaurant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/restaurant/menu", label: "Menu Items", icon: Utensils },
  { href: "/restaurant/tables", label: "QR Tables", icon: QrCode },
  { href: "/restaurant/orders", label: "Live Orders", icon: ClipboardList, badge: "Pulse" },
]

const accountItems = [
  { href: "/restaurant/subscription", label: "Subscription", icon: CreditCard },
  { href: "/restaurant/settings", label: "Settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { userData, logout } = useAuth()
  const { state } = useSidebar()

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="h-16 px-4 flex items-center justify-start border-b border-sidebar-border bg-sidebar shrink-0">
        <Link href="/restaurant/dashboard" className="flex items-center gap-2 px-2 w-full">
          <Image src="/logo.png" alt="Dineflow" width={32} height={32} className="h-8 w-8 object-contain shrink-0" priority />
          {state === "expanded" && (
            <span className="text-[16px] font-extrabold tracking-tight text-slate-800 truncate">
              Dineflow
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Platform Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {platformItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className={`
                        py-5 px-3 flex items-center gap-3 transition-colors rounded-lg font-medium text-[14px]
                        ${isActive
                          ? "bg-[#0f172a] text-white hover:bg-[#1e293b] hover:text-white font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
                      `}
                    >
                      <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.badge === "Pulse" && (
                      <SidebarMenuBadge>
                        <span className="flex h-[8px] w-[8px] rounded-full bg-red-500 animate-pulse" />
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Group */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1 mt-2">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className={`
                        py-5 px-3 flex items-center gap-3 transition-colors rounded-lg font-medium text-[14px]
                        ${isActive
                          ? "bg-[#0f172a] text-white hover:bg-[#1e293b] hover:text-white font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}
                      `}
                    >
                      <item.icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-3 px-2 py-6 rounded-xl hover:bg-slate-100 transition-colors"
                />
              }>
                  <div className="h-9 w-9 bg-slate-200 rounded-full flex items-center justify-center shrink-0 border border-slate-300">
                    <span className="font-bold text-slate-700 text-sm">
                      {userData?.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 text-left">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {userData?.name || "Loading..."}
                    </span>
                    <span className="text-[12px] truncate text-slate-500 font-medium">
                      {userData?.email || "loading@email.com"}
                    </span>
                  </div>
                  <ChevronUp className="h-4 w-4 text-slate-400 ml-auto shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] min-w-48 rounded-xl p-1.5 border border-slate-200 shadow-lg"
              >
                <DropdownMenuItem className="gap-2 cursor-pointer rounded-md py-2.5 px-3 hover:bg-slate-50 transition-colors font-medium text-slate-700" render={<Link href="/restaurant/settings" />}>
                    <Settings className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                <DropdownMenuItem
                  onClick={logout}
                  className="gap-2 cursor-pointer rounded-md py-2.5 px-3 hover:bg-red-50 text-red-600 transition-colors font-medium focus:text-red-700 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
