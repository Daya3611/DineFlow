export type UserRole = "super_admin" | "restaurant_owner";

export interface User {
  id: string; // uid
  name: string;
  email: string;
  role: UserRole;
  subscriptionId?: string;
  restaurantId?: string;
  setupFeePaid?: boolean;
  photoUrl?: string;
  hasSubscribed?: boolean;
  hasUsedTrial?: boolean;
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
  plan: string;
  customSlug?: string;
  landingPageConfig?: LandingPageConfig;
  setupFeePaid?: boolean;
  hasSubscribed?: boolean;
  hasUsedTrial?: boolean;
  lastSubscriptionEndDate?: number;
  createdAt: number;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: "active" | "inactive" | "cancelled" | "expired";
  razorpayPaymentId?: string;
  startDate: number;
  expiryDate: number;
  createdAt: number;
}

export interface PlanDocument {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  setupFee: number;
  order: number;
  features: string[];
  tableLimit: number;
  menuLimit: number; // For compatibility
  supportType: string;
  analytics: string;
  multiOutlet: boolean;
  isPopular: boolean;
  isActive: boolean;
  createdAt: number;
}

export type TableStatus = "free" | "occupied" | "reserved" | "cleaning";

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  capacity: number;
  location?: "Indoor AC" | "Outdoor Patio" | "Private Dining" | string;
  posX?: number;
  posY?: number;
  qrCodeUrl: string;
  status?: TableStatus;
  guests?: number;
  createdAt: number;
}

export interface Menu {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  hasHalfPortion?: boolean;
  halfPrice?: number;
  category: string;
  image: string; // Cloudinary URL
  description?: string; // Short description of the dish
  dietaryTags?: string[]; // "veg", "non-veg", "vegan", "spicy"
  highlight?: "popular" | "bestseller" | "chef special" | "none";
  isAvailable?: boolean;
}

export interface DiningSession {
  id: string;
  restaurantId: string;
  tableId?: string;
  tableNumber: string;
  status: "active" | "bill_requested" | "payment_pending" | "paid" | "closed" | "cancelled";
  guestCount?: number;
  totalAmount: number;
  createdAt: number;
  closedAt?: number | null;
  updatedAt: number;
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
  status: "pending" | "confirmed" | "preparing" | "served" | "paid" | "ready" | "completed";
  paymentMethod: "counter" | "upi" | "razorpay" | "cod";
  paymentStatus: "unpaid" | "partial" | "pending_verification" | "paid";
  isActive: boolean;
  sessionId: string;
  roundNumber?: number;
  splitBill?: "equal" | "custom";
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  pickupTime?: string;
  otpVerified?: boolean;
  note?: string;
  isMerged?: boolean;
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
  slotStartTime?: string;
  slotEndTime?: string;
  preferredTime?: string;
  durationMinutes?: number;
  tableId?: string;
  tableName?: string;
  seatingPreference?: string;
  guestCount: number;
  status: "pending" | "confirmed" | "arrived" | "seated" | "seated_now" | "completed" | "cancelled" | "no-show";
  notes?: string;
  specialRequest?: string;
  occasion?: string;
  isVipRegular?: boolean;
  countdown?: string;
  billingText?: string;
  cancellationReason?: string;
  systemAction?: string;
  otpVerified?: boolean;
  createdAt: number;
}

export interface Waitlist {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  guests: number;
  date?: string;
  timeSlot?: string;
  time: number;
  status: "waiting" | "table_ready" | "notified" | "seated" | "cancelled" | "removed";
  waitedTime?: string;
  estimatedWait?: string;
  tableAvailability?: string;
  preference?: string;
  partyTag?: string;
  specialRequest?: string;
  notifiedAt?: number;
}
