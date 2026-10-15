import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CustomerHeaderNav } from '@/components/customer/CustomerHeaderNav';
import { Calendar, ShoppingBag, Utensils, Compass, Phone, ShieldCheck, MapPin, ChevronRight, Star } from 'lucide-react';

export const revalidate = 0;
export const dynamic = "force-dynamic";

async function getRestaurant(slug: string) {
  try {
    const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/firebase');
    
    const q = query(collection(db, 'restaurants'), where('customSlug', '==', slug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
    }
    const fallbackSnap = await getDoc(doc(db, 'restaurants', slug));
    if (fallbackSnap.exists()) {
      return { id: fallbackSnap.id, ...fallbackSnap.data() } as any;
    }
  } catch (e) {
    console.error('Direct Firestore fetch error:', e);
  }
  return null;
}

async function getPopularMenu(slug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/menu/${slug}`, { cache: 'no-store' });
    if (res.ok) return await res.json();
  } catch (e) {
    console.error('Failed to fetch menu:', e);
  }
  return [];
}

export default async function RestaurantHomePage(props: { params: Promise<{ restaurantSlug: string }> }) {
  const params = await props.params;
  let slug = params.restaurantSlug;

  if (slug.startsWith('%40')) slug = slug.substring(3);
  else if (slug.startsWith('@')) slug = slug.substring(1);
  else return notFound();

  const restaurant = await getRestaurant(slug);
  if (!restaurant) return notFound();

  const plainRestaurant = JSON.parse(JSON.stringify(restaurant));
  const popularMenu = await getPopularMenu(slug);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 select-none">
      {/* Shared Header Nav */}
      <CustomerHeaderNav restaurant={plainRestaurant} slug={slug} activeTab="home" />

      {/* Hero Banner */}
      <div className="max-w-[1200px] mx-auto px-4 pt-4">
        <div className="relative w-full h-[260px] sm:h-[360px] rounded-3xl overflow-hidden shadow-sm">
          <img
            src={restaurant.logo || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop"}
            alt={restaurant.name}
            className="w-full h-full object-cover brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-6 inset-x-6 text-white">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md">
              {restaurant.name}
            </h1>
            <p className="text-sm font-semibold text-slate-200 mt-1">
              {restaurant.address || "Parvati Apartment, 03A Ganesh Pada"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 pt-6 space-y-8">
        {/* Primary Intent Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: BOOK A TABLE */}
          <Link
            href={`/@${slug}/book`}
            className="p-6 rounded-3xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all group flex flex-col justify-between h-[180px] relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Calendar className="h-6 w-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white text-emerald-800 uppercase tracking-wider">
                Instant Reservation
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-black group-hover:translate-x-1 transition-transform">
                BOOK A TABLE →
              </h2>
              <p className="text-xs text-emerald-100 font-semibold mt-1">
                Choose date, time & number of guests. Real-time slot availability.
              </p>
            </div>
          </Link>

          {/* Card 2: ORDER FOOD */}
          <Link
            href={`/@${slug}/order`}
            className="p-6 rounded-3xl bg-slate-900 hover:bg-black text-white shadow-md transition-all group flex flex-col justify-between h-[180px] relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
                <ShoppingBag className="h-6 w-6 text-emerald-400" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white uppercase tracking-wider">
                Pickup & Delivery
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-black group-hover:translate-x-1 transition-transform">
                ORDER FOOD ONLINE →
              </h2>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                Order for home delivery or fast pickup from the restaurant.
              </p>
            </div>
          </Link>

        </div>

        {/* Popular Dishes Preview */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Popular Dishes
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Customer favorites at {restaurant.name}
              </p>
            </div>
            <Link
              href={`/@${slug}/menu`}
              className="text-xs font-extrabold text-emerald-700 hover:underline flex items-center gap-1"
            >
              View Full Menu <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {popularMenu.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm font-medium">
              No menu items configured yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {popularMenu.slice(0, 3).map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between gap-3"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {item.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">
                      {item.description || "Freshly cooked to perfection"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-sm font-black text-slate-900">₹{item.price}</span>
                    <Link
                      href={`/@${slug}/order`}
                      className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 transition"
                    >
                      + Order
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Restaurant Features & Amenities */}
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <h3 className="text-xl font-extrabold text-slate-900 mb-4">
            Restaurant Amenities
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-extrabold text-slate-700">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Indoor Dining
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Outdoor Seating
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Family Friendly
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Valet Parking
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
