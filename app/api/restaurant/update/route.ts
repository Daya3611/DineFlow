import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantId, customSlug, ...updateData } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'Missing restaurantId' }, { status: 400 });
    }

    if (!adminDb) {
      throw new Error("Firebase admin not initialized");
    }

    if (customSlug) {
      // Backend Validation
      const slugQuery = await adminDb.collection('restaurants').where('customSlug', '==', customSlug).get();
      const isTaken = slugQuery.docs.some(doc => doc.id !== restaurantId);

      if (isTaken) {
        return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
      }

      // Also create a document in 'slugs' collection to enforce database-level uniqueness if desired
      // This helps prevent race conditions during concurrent requests.
      const slugRef = adminDb.collection('slugConstraints').doc(customSlug);
      
      await adminDb.runTransaction(async (transaction) => {
        const slugRef = adminDb.collection('slugConstraints').doc(customSlug);
        const docSnap = await transaction.get(slugRef);
        if (docSnap.exists && docSnap.data()?.restaurantId !== restaurantId) {
          throw new Error('Slug already in use');
        }

        const restRef = adminDb.collection('restaurants').doc(restaurantId);
        const currentRestSnap = await transaction.get(restRef);
        const oldSlug = currentRestSnap.data()?.customSlug;

        // If changing slug, release the old one
        if (oldSlug && oldSlug !== customSlug) {
          const oldSlugRef = adminDb.collection('slugConstraints').doc(oldSlug);
          transaction.delete(oldSlugRef);
        }

        transaction.set(slugRef, { restaurantId, updatedAt: Date.now() });
        transaction.set(restRef, { ...updateData, customSlug }, { merge: true });
      });

    } else {
      // No slug provided, standard update but try to release old slug
      const restRef = adminDb.collection('restaurants').doc(restaurantId);
      await adminDb.runTransaction(async (transaction) => {
        const currentRestSnap = await transaction.get(restRef);
        const oldSlug = currentRestSnap.data()?.customSlug;
        if (oldSlug) {
          const oldSlugRef = adminDb.collection('slugConstraints').doc(oldSlug);
          transaction.delete(oldSlugRef);
        }
        transaction.set(restRef, { ...updateData, customSlug: "" }, { merge: true });
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Slug already in use' ? 409 : 500 });
  }
}
