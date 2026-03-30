import { create } from "zustand";
import { User as FirebaseUser, onAuthStateChanged, Unsubscribe } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, Restaurant, Subscription } from "@/types";

interface AuthState {
  user: FirebaseUser | null;
  userData: User | null;
  restaurant: Restaurant | null;
  subscription: Subscription | null;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setUserData: (userData: User | null) => void;
  setRestaurant: (restaurant: Restaurant | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  initialize: () => Unsubscribe;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  userData: null,
  restaurant: null,
  subscription: null,
  loading: true,
  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  setRestaurant: (restaurant) => set({ restaurant }),
  setSubscription: (subscription) => set({ subscription }),

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      set({ loading: true });
      if (firebaseUser) {
        set({ user: firebaseUser });
        try {
          // Fetch user data from firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as User;
            set({ userData: data });

            // If user has a restaurant, fetch it
            let hasExpired = false;
            if (data.restaurantId) {
              const resDoc = await getDoc(doc(db, "restaurants", data.restaurantId));
              if (resDoc.exists()) {
                const resData = resDoc.data() as Restaurant;
                set({ restaurant: resData });
              }
            }

            if (data.subscriptionId) {
              const subDoc = await getDoc(doc(db, "subscriptions", data.subscriptionId));
              if (subDoc.exists()) {
                const subData = subDoc.data() as Subscription;
                
                // Real-time check
                if (subData.status === "active" && subData.expiryDate < Date.now()) {
                  subData.status = "expired";
                  await updateDoc(doc(db, "subscriptions", data.subscriptionId), {
                    status: "expired"
                  });
                  if (data.restaurantId) {
                     await updateDoc(doc(db, "restaurants", data.restaurantId), {
                       subscriptionStatus: "expired"
                     });
                     // Update current restaurant state
                     set((state) => ({ 
                       restaurant: state.restaurant ? { ...state.restaurant, subscriptionStatus: "expired" } : null 
                     }));
                  }
                }
                set({ subscription: subData });
              } else {
                set({ subscription: null });
              }
            } else {
              set({ subscription: null });
            }

          } else {
            set({ userData: null });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        set({ user: null, userData: null, restaurant: null, subscription: null });
      }
      set({ loading: false });
    });

    return unsubscribe;
  },
}));
