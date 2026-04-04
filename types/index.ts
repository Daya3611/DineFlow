export type UserRole = "super_admin" | "restaurant_owner";

export interface User {
  id: string; // uid
  name: string;
  email: string;
  role: UserRole;
  subscriptionId?: string;
  restaurantId?: string;
  photoUrl?: string;
  createdAt: number;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  gstNumber?: string;
  upiId?: string;
  logo: string; // Cloudinary URL
  subscriptionStatus: "active" | "inactive" | "expired";
  plan: "basic" | "pro" | "premium" | "trial" | "none";
  customSlug?: string;
  createdAt: number;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: "basic" | "pro" | "premium" | "trial";
  status: "active" | "inactive" | "cancelled" | "expired";
  razorpayPaymentId?: string;
  startDate: number;
  expiryDate: number;
  createdAt: number;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number; // Add capacity
  qrCodeUrl: string;
  status?: "free" | "occupied" | "reserved";
  guests?: number;
  createdAt: number;
}

export interface Menu {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  category: string;
  image: string; // Cloudinary URL
  dietaryTags?: string[]; // "veg", "non-veg", "vegan", "spicy"
  highlight?: "popular" | "chef special" | "none";
}

export interface OrderItem {
  id: string; // references menu item ID
  name: string;
  price: number;
  quantity: number;
  note?: string; // Item-level notes
}

export interface Order {
  id: string;
  restaurantId: string;
  tableNumber: string;
  tableId?: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "preparing" | "served" | "paid";
  paymentMethod: "counter" | "upi" | "razorpay";
  paymentStatus: "unpaid" | "partial" | "pending_verification" | "paid";
  isActive: boolean;
  sessionId: string;
  splitBill?: "equal" | "custom";
  customerName?: string;
  note?: string;
  createdAt: number;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  customerName: string;
  phone: string;
  email?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number; // Duration length
  tableId?: string; // Assigned table
  guestCount: number;
  status: "pending" | "confirmed" | "arrived" | "no-show" | "completed" | "cancelled";
  notes?: string;
  createdAt: number;
}

export interface Waitlist {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  guests: number;
  date: string; // Target date
  timeSlot: string; // Target time string
  time: number; // timestamp
  status: "waiting" | "notified" | "seated" | "cancelled";
}
