import { notFound } from 'next/navigation';
import { OrderFoodClient } from '@/components/customer/OrderFoodClient';

export const revalidate = 0;
export const dynamic = "force-dynamic";

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
    console.error("Error fetching restaurant and menu for takeaway:", e);
    return null;
  }
}

export default async function TakeawayServerPage(props: { params: Promise<{ restaurantSlug: string }> }) {
  const params = await props.params;
  let slug = params.restaurantSlug;

  if (slug.startsWith('%40')) slug = slug.substring(3);
  else if (slug.startsWith('@')) slug = slug.substring(1);
  else return notFound();

  const data = await getRestaurantAndMenu(slug);
  if (!data) return notFound();

  const plainData = JSON.parse(JSON.stringify(data));
  return <OrderFoodClient restaurant={plainData.restaurant} menuItems={plainData.menuItems} slug={slug} />;
}