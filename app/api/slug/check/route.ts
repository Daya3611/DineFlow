import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const restaurantId = searchParams.get('restaurantId');

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    if (!adminDb) {
      throw new Error("Firebase admin not initialized");
    }

    // 1. Check legacy restaurants without constraint docs
    const slugQuery = await adminDb.collection('restaurants').where('customSlug', '==', slug).get();
    let isTaken = slugQuery.docs.some(doc => doc.id !== restaurantId);

    // 2. Check strict constraint locks
    if (!isTaken) {
      const slugDoc = await adminDb.collection('slugConstraints').doc(slug).get();
      isTaken = slugDoc.exists && slugDoc.data()?.restaurantId !== restaurantId;
    }

    if (!isTaken) {
      return NextResponse.json({ available: true });
    }

    // If taken, generate alternatives by appending numbers
    let checkIndex = 1;
    let alternatives = [];
    
    while(alternatives.length < 3 && checkIndex < 20) {
      const option = `${slug}-${checkIndex}`;
      
      const altQuery = await adminDb.collection('restaurants').where('customSlug', '==', option).get();
      let altTaken = altQuery.docs.some(doc => doc.id !== restaurantId);

      if (!altTaken) {
        const altDoc = await adminDb.collection('slugConstraints').doc(option).get();
        altTaken = altDoc.exists && altDoc.data()?.restaurantId !== restaurantId;
      }

      if (!altTaken) {
        alternatives.push(option);
      }
      checkIndex++;
    }

    return NextResponse.json({ available: false, alternatives });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
