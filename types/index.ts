export type UserRole = "super_admin" | "restaurant_owner";

export interface User {
  id: string; // uid
  name: string;
  email: string;
  role: UserRole;
  subscriptionId?: string;
  restaurantId?: string;
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
  subscriptionStatus: "active" | "inactive";
  plan: "basic" | "pro" | "none";
  createdAt: number;
}

export interface Menu {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  category: string;
  image: string; // Cloudinary URL
}

export interface Subscription {
  id: string;
  userId: string;
  plan: "basic" | "pro";
  status: "active" | "inactive" | "cancelled";
  razorpayPaymentId?: string;
  expiryDate: number;
  createdAt: number;
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  qrCodeUrl: string;
  createdAt: number;
}

export interface OrderItem {
  id: string; // references menu item ID
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "preparing" | "served" | "paid";
  paymentMethod: "counter" | "upi" | "razorpay";
  paymentStatus: "unpaid" | "pending_verification" | "paid";
  customerName?: string;
  createdAt: number;
}
