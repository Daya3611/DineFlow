"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Loader2, Zap, ArrowLeft, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function UpdatesPage() {
  const { restaurant, subscription, loading } = useAuth();
  const router = useRouter();
  const [updates, setUpdates] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;

    // Optional Check: redirect if not premium
    const planSlug = (subscription?.plan || restaurant?.plan || "").toLowerCase();
    if (!planSlug.includes("premium")) {
      router.replace("/restaurant/dashboard");
      return;
    }

    const fetchUpdates = async () => {
      try {
        setFetching(true);
        const q = query(
          collection(db, "updates"),
          where("isActive", "==", true)
        );
        const snap = await getDocs(q);
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Manually sort because we might not have a composite index for isActive + createdAt
        fetched.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setUpdates(fetched);
      } catch (err) {
        console.error("Failed to fetch updates:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchUpdates();
  }, [loading, restaurant, subscription, router]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f9d6a]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-emerald-500 fill-emerald-100" />
            Latest Updates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            See what's new for our Premium users.
          </p>
        </div>
      </div>

      <div className="space-y-6 mt-8">
        {updates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Zap className="h-12 w-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No active updates to show at this time.</p>
          </div>
        ) : (
          updates.map((update, idx) => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
            >
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {update.title}
                    </h2>
                    {update.createdAt && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 shrink-0 bg-slate-50 px-2.5 py-1 rounded-full">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(update.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </div>
                    )}
                  </div>
                  <div className="prose prose-slate prose-sm max-w-none text-slate-600">
                    <p className="whitespace-pre-wrap">{update.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
