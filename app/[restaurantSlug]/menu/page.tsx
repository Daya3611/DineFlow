import { notFound } from 'next/navigation';
import ClientMenu from './ClientMenu';
import { CustomerHeaderNav } from '@/components/customer/CustomerHeaderNav';

async function getRestaurantAndMenu(slug: string) {
  try {
    const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/firebase');
    
    const q = query(collection(db, 'restaurants'), where('customSlug', '==', slug));
    const snap = await getDocs(q);
    let restaurant: any = null;
    if (!snap.empty) {
      restaurant = { id: snap.docs[0].id, ...snap.docs[0].data() };
    } else {
      const fallbackSnap = await getDoc(doc(db, 'restaurants', slug));
      if (fallbackSnap.exists()) {
        restaurant = { id: fallbackSnap.id, ...fallbackSnap.data() };
      }
    }

    if (!restaurant) return null;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const menuReq = await fetch(`${baseUrl}/api/menu/${slug}`, { cache: 'no-store' });
    const menuItems = menuReq.ok ? await menuReq.json() : [];

    return { restaurant, menuItems };
  } catch (e) {
    console.error("Error in getRestaurantAndMenu:", e);
    return null;
  }
}

export default async function MenuServerPage(props: {
  params: Promise<{ restaurantSlug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  let slug = params.restaurantSlug;

  if (slug.startsWith('%40')) slug = slug.substring(3);
  else if (slug.startsWith('@')) slug = slug.substring(1);
  else return notFound();

  const data = await getRestaurantAndMenu(slug);
  if (!data) return notFound();

  const plainData = JSON.parse(JSON.stringify(data));
  const table = searchParams.table || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <CustomerHeaderNav restaurant={plainData.restaurant} slug={slug} activeTab="menu" />
      <ClientMenu
        initialRestaurant={plainData.restaurant}
        initialMenus={plainData.menuItems}
        table={table}
      />
    </div>
  );
}