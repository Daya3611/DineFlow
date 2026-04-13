import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 });

    const q = query(collection(db, 'menus'), where('restaurantId', '==', restaurantId));
    const menusSnap = await getDocs(q);
    
    // Return minimal required data for client-side rendering
    const menus = menusSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        price: data.price,
        category: data.category,
        image: data.image,
        dietaryTags: data.dietaryTags,
        highlight: data.highlight,
      };
    });

    return NextResponse.json(menus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
