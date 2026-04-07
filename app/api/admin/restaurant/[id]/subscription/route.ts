import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: restaurantId } = await context.params;
    const body = await request.json();
    const { plan, expiry_date, status } = body;

    // Validate request
    if (!plan && !expiry_date && !status) {
      return NextResponse.json({ error: 'Missing fields to update' }, { status: 400 });
    }

    // 1. Fetch Restaurant
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);

    if (!restaurantSnap.exists()) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const restaurantData = restaurantSnap.data();

    // 2. Prepare Updates
    const restaurantUpdates: any = {};
    if (plan) restaurantUpdates.plan = plan;
    if (status) restaurantUpdates.subscriptionStatus = status;

    // 3. Find associated subscription
    const ownerId = restaurantData.ownerId;
    let subscriptionId = null;

    if (ownerId) {
      const userRef = doc(db, 'users', ownerId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().subscriptionId) {
        subscriptionId = userSnap.data().subscriptionId;
      }
    }

    // 4. Update Subscription Document (if it exists)
    if (subscriptionId) {
      const subRef = doc(db, 'subscriptions', subscriptionId);
      const subUpdates: any = {};
      
      if (plan) subUpdates.plan = plan;
      if (status) subUpdates.status = status;
      if (expiry_date) {
        // Assume format YYYY-MM-DD
        subUpdates.expiryDate = new Date(expiry_date).getTime();
      }

      await updateDoc(subRef, subUpdates);
    }

    // 5. Update Restaurant Document
    if (Object.keys(restaurantUpdates).length > 0) {
      await updateDoc(restaurantRef, restaurantUpdates);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription updated successfully',
      updated: {
        restaurantId,
        subscriptionId,
        plan: plan || restaurantData.plan,
        status: status || restaurantData.subscriptionStatus
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
