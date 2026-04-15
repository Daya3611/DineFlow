import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantId, guestCount, type, ...rest } = body;

    if (!restaurantId || !guestCount || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!adminDb) throw new Error('Firebase admin not initialized');
    const restaurantDoc = await adminDb.collection('restaurants').doc(restaurantId).get();
    if (!restaurantDoc.exists) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    

    const id = type === 'reservation' ? `res_${Date.now()}` : `wait_${Date.now()}`;
    const collectionName = type === 'reservation' ? 'reservations' : 'waitlist';

    let newRecord: any = {
      id,
      restaurantId,
      createdAt: Date.now(),
    };

    if (type === 'reservation') {
      newRecord = {
        ...newRecord,
        guestCount: parseInt(guestCount, 10),
        ...rest,
        status: 'pending',
      };
    } else {
      // mapping waitlist fields to match the Waitlist interface
      newRecord = {
        ...newRecord,
        name: rest.customerName,
        guests: parseInt(guestCount, 10),
        phone: rest.phone,
        date: rest.date,
        timeSlot: rest.time,
        time: Date.now(), // required by Waitlist interface
        status: 'waiting',
        ...rest, // preserve emails, notes
      };
    }

    await adminDb.collection(collectionName).doc(id).set(newRecord);

    return NextResponse.json({ success: true, id, type });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
