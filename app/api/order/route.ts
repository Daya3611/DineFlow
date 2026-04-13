import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id: incomingId, orderId, restaurantId, tableNumber, tableId, items, totalAmount, ...rest } = body;

    if (!restaurantId || !items || !totalAmount) {
      return NextResponse.json({ error: 'Missing core order requirements' }, { status: 400 });
    }

    if (body.type === "takeaway") {
      const { customerName, customerPhone, customerEmail, pickupTime, paymentMethod } = rest as any;
      if (!customerName || !customerPhone || !customerEmail) {
        return NextResponse.json({ error: "Missing customer details (name, phone, email)" }, { status: 400 });
      }
      if (!pickupTime) {
        return NextResponse.json({ error: "Pickup time required for takeaway" }, { status: 400 });
      }
      if (!paymentMethod) {
        return NextResponse.json({ error: "Payment method missing" }, { status: 400 });
      }
    } else if (!tableNumber) {
      return NextResponse.json({ error: 'Missing required fields (tableNumber)' }, { status: 400 });
    }

    if (!adminDb) throw new Error('Firebase admin not initialized');
    const restaurantDoc = await adminDb.collection('restaurants').doc(restaurantId).get();
    if (!restaurantDoc.exists) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }


    const finalId = incomingId || orderId || `ord_${Date.now()}`;
    const newOrder = {
      id: finalId,
      restaurantId,
      tableNumber,
      tableId,
      items,
      totalAmount,
      ...rest,
      createdAt: Date.now()
    };

    await adminDb.collection('orders').doc(finalId).set(newOrder);

    // If tableId exists, update table to occupied, but don't fail if it doesn't exist
    if (tableId) {
      try {
        await adminDb.collection('tables').doc(tableId).update({ status: 'occupied' });
      } catch (err) {
        console.warn('Could not update table status. Table may not exist.', err);
      }
    }

    return NextResponse.json({ success: true, orderId: finalId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
