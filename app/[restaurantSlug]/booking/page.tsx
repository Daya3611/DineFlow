import { notFound } from 'next/navigation';
import { BookTableClient } from '@/components/customer/BookTableClient';

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

export default async function BookingSlugPage(props: { params: Promise<{ restaurantSlug: string }> }) {
  const params = await props.params;
  let slug = params.restaurantSlug;

  if (slug.startsWith('%40')) slug = slug.substring(3);
  else if (slug.startsWith('@')) slug = slug.substring(1);
  else return notFound();

  const restaurant = await getRestaurant(slug);
  if (!restaurant) return notFound();

  const plainRestaurant = JSON.parse(JSON.stringify(restaurant));
  return <BookTableClient restaurant={plainRestaurant} slug={slug} />;
}
