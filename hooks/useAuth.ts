import { create } from "zustand";
import { User as FirebaseUser, onAuthStateChanged, Unsubscribe } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { User, Restaurant } from "@/types";

interface AuthState {
  user: FirebaseUser | null;
  userData: User | null;
  restaurant: Restaurant | null;
  loading: boolean;
  setUser: (user: FirebaseUser | null) => void;
  setUserData: (userData: User | null) => void;
  setRestaurant: (restaurant: Restaurant | null) => void;
  initialize: () => Unsubscribe;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  userData: null,
  restaurant: null,
  loading: true,
  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  setRestaurant: (restaurant) => set({ restaurant }),

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
            if (data.restaurantId) {
              const resDoc = await getDoc(doc(db, "restaurants", data.restaurantId));
              if (resDoc.exists()) {
                set({ restaurant: resDoc.data() as Restaurant });
              }
            }
          } else {
            set({ userData: null });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        set({ user: null, userData: null, restaurant: null });
      }
      set({ loading: false });
    });

    return unsubscribe;
  },
}));
