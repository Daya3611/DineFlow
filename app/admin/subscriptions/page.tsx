"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";

interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  razorpayPaymentId: string;
  expiryDate: number;
  createdAt: number;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const q = query(collection(db, "subscriptions"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data: Subscription[] = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data() as Subscription);
      });
      setSubscriptions(data);
    } catch (error) {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-sm shadow-slate-200">
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>View all active and past subscriptions across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No subscriptions found.</div>
        ) : (
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Subscription ID</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Expiry Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-slate-900 line-clamp-1 max-w-[150px]" title={sub.id}>
                      {sub.id}
                    </TableCell>
                    <TableCell className="capitalize text-slate-600">{sub.plan}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(sub.expiryDate).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
