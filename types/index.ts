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

export interface LandingPageConfig {
  theme: {
    primaryColor: string;
    backgroundColor: string;
    buttonStyle: "solid" | "gradient" | "outline";
    cardStyle: "rounded" | "sharp";
  };
  layout: {
    showTakeaway: boolean;
    showBookTable: boolean;
    showTrackOrder: boolean;
  };
  cta: {
    takeawayText: string;
    bookingText: string;
    trackOrderText: string;
  };
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
  landingPageConfig?: LandingPageConfig;
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
  posX?: number;
  posY?: number;
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
  description?: string; // Short description of the dish
  dietaryTags?: string[]; // "veg", "non-veg", "vegan", "spicy"
  highlight?: "popular" | "bestseller" | "chef special" | "none";
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
  restaurantSlug?: string;
  type?: "dine-in" | "takeaway";
  tableNumber: string;
  tableId?: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "preparing" | "served" | "paid" | "ready" | "completed";
  paymentMethod: "counter" | "upi" | "razorpay" | "cod";
  paymentStatus: "unpaid" | "partial" | "pending_verification" | "paid";
  isActive: boolean;
  sessionId: string;
  splitBill?: "equal" | "custom";
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  pickupTime?: string;
  otpVerified?: boolean;
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
  time: string; // HH:MM (Legacy or maps to preferred)
  slotStartTime?: string;
  slotEndTime?: string;
  preferredTime?: string;
  durationMinutes: number; // Duration length
  tableId?: string; // Assigned table
  guestCount: number;
  status: "pending" | "confirmed" | "arrived" | "no-show" | "completed" | "cancelled";
  notes?: string;
  otpVerified?: boolean;
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
