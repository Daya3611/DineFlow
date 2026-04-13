"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  razorpayPaymentId: string;
  expiryDate: number;
  createdAt: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      // By using subscriptions collection, we can get payment history 
      // (assuming one subscription record = one payment for now)
      const q = query(collection(db, "subscriptions"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data: Subscription[] = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data() as Subscription);
      });
      setPayments(data);
    } catch (_) {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const getAmountForPlan = (plan: string) => {
    return plan === "pro" ? "₹499" : plan === "premium" ? "₹999" : plan === "basic" ? "₹299" : "₹0";
  };

  return (
    <Card className="border-none shadow-sm shadow-slate-200">
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>Track all successful Razorpay transactions recorded in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No payment records found.</div>
        ) : (
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Razorpay Payment ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm text-slate-900">
                      {payment.razorpayPaymentId}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm max-w-[120px] truncate" title={payment.userId}>
                      {payment.userId}
                    </TableCell>
                    <TableCell className="font-semibold text-[#0f9d6a]">
                      {getAmountForPlan(payment.plan)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(payment.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8" title="Copy ID" onClick={() => {
                        navigator.clipboard.writeText(payment.razorpayPaymentId);
                        toast.success("Payment ID copied to clipboard");
                      }}>
                        <ExternalLink className="h-4 w-4 text-slate-500" />
                      </Button>
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
