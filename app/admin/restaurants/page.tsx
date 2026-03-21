"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Restaurant } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "restaurants"));
      const data: Restaurant[] = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data() as Restaurant);
      });
      setRestaurants(data);
    } catch (error) {
      toast.error("Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscription = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateDoc(doc(db, "restaurants", id), {
        subscriptionStatus: newStatus,
      });
      setRestaurants(restaurants.map((r) => r.id === id ? { ...r, subscriptionStatus: newStatus } : r));
      toast.success("Subscription status updated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <Card className="border-none shadow-sm shadow-slate-200">
      <CardHeader>
        <CardTitle>Restaurants Directory</CardTitle>
        <CardDescription>View and manage all restaurants registered on the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No restaurants found.</div>
        ) : (
          <div className="rounded-md border border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Restaurant Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((restaurant) => (
                  <TableRow key={restaurant.id}>
                    <TableCell>
                      {restaurant.logo ? (
                         <img src={restaurant.logo} alt={restaurant.name} className="h-10 w-10 rounded-full object-cover border border-slate-200" />
                      ) : (
                         <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">?</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{restaurant.name}</TableCell>
                    <TableCell className="capitalize text-slate-600">{restaurant.plan}</TableCell>
                    <TableCell>
                      <Badge variant={restaurant.subscriptionStatus === "active" ? "default" : "destructive"}>
                        {restaurant.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={restaurant.subscriptionStatus === "active" ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"}
                        onClick={() => toggleSubscription(restaurant.id, restaurant.subscriptionStatus)}
                      >
                        {restaurant.subscriptionStatus === "active" ? "Deactivate" : "Activate"}
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
