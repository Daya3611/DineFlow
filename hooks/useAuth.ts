import { create } from "zustand";
import { User as FirebaseUser, onAuthStateChanged, onIdTokenChanged, Unsubscribe } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, Restaurant, Subscription } from "@/types";
import { jwtDecode } from "jwt-decode";

export const isTokenValid = () => {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const decoded: any = jwtDecode(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

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
  isAuthenticated: boolean;
  token: string | null;
  logout: () => Promise<void>;
  checkToken: () => boolean;
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
  isAuthenticated: false,
  token: null,

  logout: async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    set({ user: null, userData: null, restaurant: null, subscription: null, isAuthenticated: false, token: null });
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  },

  checkToken: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const tokenExpired = payload.exp * 1000 < Date.now();
          if (tokenExpired) {
             localStorage.removeItem("token");
             set({ isAuthenticated: false, token: null });
             return false;
          }
          set({ isAuthenticated: true, token });
          return true;
        } catch (e) {
             localStorage.removeItem("token");
             set({ isAuthenticated: false, token: null });
             return false;
        }
      }
    }
    set({ isAuthenticated: false, token: null });
    return false;
  },

  initialize: () => {
    useAuth.getState().checkToken();
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      set({ loading: true });
      if (firebaseUser) {
        set({ user: firebaseUser });
        if (typeof window !== "undefined") {
          const token = await firebaseUser.getIdToken();
          localStorage.setItem("token", token);
          set({ isAuthenticated: true, token });
        }
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
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        set({ user: null, userData: null, restaurant: null, subscription: null });
      }
      set({ loading: false });
    });

    return unsubscribe;
  },
}));
