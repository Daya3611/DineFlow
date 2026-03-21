"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Store, CreditCard, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RestaurantDashboard() {
  const { userData, restaurant } = useAuth();
  
  const hasRestaurant = !!restaurant;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome, {userData?.name}</h1>
          <p className="text-slate-500 mt-1">Manage your digital presence and daily operations.</p>
        </div>
        {!hasRestaurant && (
          <Link href="/restaurant/settings">
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20">
              Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {!hasRestaurant ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-indigo-100 bg-indigo-50/50">
            <CardHeader>
              <CardTitle className="text-indigo-900">Finish setting up your restaurant</CardTitle>
              <CardDescription className="text-indigo-700/80">
                You need to create your restaurant profile before you can manage menus and accept payments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/restaurant/settings">
                <Button className="bg-indigo-600">Create Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-none shadow-sm shadow-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Restaurant Status
              </CardTitle>
              <Store className="h-5 w-5 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{restaurant.name}</div>
              <div className="mt-2">
                <Badge variant={restaurant.subscriptionStatus === "active" ? "default" : "destructive"}>
                  {restaurant.subscriptionStatus === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm shadow-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Current Plan
              </CardTitle>
              <CreditCard className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 capitalize">{restaurant.plan} Plan</div>
              <p className="text-xs text-slate-500 mt-1">
                {restaurant.plan === "none" ? "Upgrade required" : "Billed monthly"}
              </p>
            </CardContent>
            {restaurant.plan === "none" && (
              <CardFooter className="pb-4 pt-0">
                <Link href="/restaurant/subscription" className="w-full">
                   <Button variant="outline" className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50">View Plans</Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          <Card className="border-none shadow-sm shadow-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Menu Items
              </CardTitle>
              <Activity className="h-5 w-5 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">0</div>
              <p className="text-xs text-slate-500 mt-1">Pending items to review</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
