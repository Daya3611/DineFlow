import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    let slug = params.slug;
    
    if (slug.startsWith('%40')) slug = slug.substring(3);
    else if (slug.startsWith('@')) slug = slug.substring(1);

    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    // 1. Fetch the restaurant using slug to get the restaurantId
    const resQ = query(collection(db, 'restaurants'), where('customSlug', '==', slug));
    const resSnap = await getDocs(resQ);
    let restaurantId = slug;

    if (resSnap.empty) {
      // Check if it's actually accessing via raw document ID
      const { getDoc, doc } = await import('firebase/firestore');
      const fallbackSnap = await getDoc(doc(db, 'restaurants', slug));
      if (!fallbackSnap.exists()) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
      }
      restaurantId = fallbackSnap.id;
    } else {
      restaurantId = resSnap.docs[0].id;
    }

    // 2. Fetch menu items for this restaurant
    const q = query(collection(db, 'menus'), where('restaurantId', '==', restaurantId));
    const menusSnap = await getDocs(q);
    
    // Return complete menu data including half portion pricing, description & availability
    const menus = menusSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        restaurantId: data.restaurantId,
        name: data.name,
        price: data.price,
        hasHalfPortion: Boolean(data.hasHalfPortion),
        halfPrice: data.halfPrice ? Number(data.halfPrice) : null,
        category: data.category,
        image: data.image,
        description: data.description || "",
        dietaryTags: data.dietaryTags || [],
        highlight: data.highlight || "none",
        isAvailable: data.isAvailable !== false,
      };
    });

    return NextResponse.json(menus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
