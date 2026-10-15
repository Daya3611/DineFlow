import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id: incomingId,
      orderId,
      restaurantId,
      tableNumber,
      tableId,
      items,
      totalAmount,
      sessionId: incomingSessionId,
      ...rest
    } = body;

    if (!restaurantId || !items || totalAmount === undefined) {
      return NextResponse.json({ error: 'Missing core order requirements' }, { status: 400 });
    }

    const isTakeawayOrDelivery = ["takeaway", "pickup", "delivery"].includes(body.type || body.orderType);

    if (isTakeawayOrDelivery) {
      const { customerName, customerPhone, pickupTime, paymentMethod } = rest as any;
      if (!customerName || !customerPhone) {
        return NextResponse.json({ error: "Missing customer details (name and phone required)" }, { status: 400 });
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

    let finalSessionId = incomingSessionId;
    let roundNumber = 1;

    // Dine-in Session resolution
    if (!isTakeawayOrDelivery) {
      let sessionRef: any = null;

      if (incomingSessionId) {
        const sDoc = await adminDb.collection('diningSessions').doc(incomingSessionId).get();
        if (sDoc.exists && sDoc.data()?.status === 'active') {
          sessionRef = sDoc.ref;
        }
      }

      if (!sessionRef) {
        // Find existing active session for restaurantId + tableNumber
        const activeSnap = await adminDb
          .collection('diningSessions')
          .where('restaurantId', '==', restaurantId)
          .where('tableNumber', '==', tableNumber)
          .where('status', 'in', ['active', 'bill_requested', 'payment_pending'])
          .limit(1)
          .get();

        if (!activeSnap.empty) {
          sessionRef = activeSnap.docs[0].ref;
          finalSessionId = activeSnap.docs[0].id;
        } else {
          // Create new active DiningSession
          finalSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const newSession: Record<string, any> = {
            id: finalSessionId,
            restaurantId,
            tableId: tableId || null,
            tableNumber,
            status: 'active',
            totalAmount: 0,
            createdAt: Date.now(),
            closedAt: null,
            updatedAt: Date.now(),
          };
          await adminDb.collection('diningSessions').doc(finalSessionId).set(newSession);
          sessionRef = adminDb.collection('diningSessions').doc(finalSessionId);
        }
      }

      // Calculate roundNumber for this session
      const existingOrdersSnap = await adminDb
        .collection('orders')
        .where('sessionId', '==', finalSessionId)
        .get();

      roundNumber = existingOrdersSnap.size + 1;

      // Update parent session totalAmount
      if (sessionRef) {
        const currSessionDoc = await sessionRef.get();
        const currTotal = currSessionDoc.data()?.totalAmount || 0;
        await sessionRef.update({
          totalAmount: currTotal + totalAmount,
          status: 'active',
          updatedAt: Date.now(),
        });
      }

      // Mark table as occupied
      let targetTableId = tableId;
      if (!targetTableId) {
        const tq = await adminDb
          .collection('tables')
          .where('restaurantId', '==', restaurantId)
          .where('tableNumber', '==', tableNumber)
          .limit(1)
          .get();
        if (!tq.empty) targetTableId = tq.docs[0].id;
      }
      if (targetTableId) {
        try {
          await adminDb.collection('tables').doc(targetTableId).update({ status: 'occupied' });
        } catch (err) {
          console.warn('Could not update table status:', err);
        }
      }
    }

    const finalId = incomingId || orderId || `ord_${Date.now()}`;
    const rawOrderData: Record<string, any> = {
      id: finalId,
      restaurantId,
      tableNumber: tableNumber || null,
      tableId: tableId || null,
      sessionId: isTakeawayOrDelivery ? null : (finalSessionId || `sess_${Date.now()}`),
      roundNumber: isTakeawayOrDelivery ? null : roundNumber,
      items,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid',
      isActive: true,
      ...rest,
      type: isTakeawayOrDelivery ? "takeaway" : (rest.type || "dine-in"),
      createdAt: Date.now()
    };

    // Remove any keys that are undefined to be 100% compliant with Firestore SDK
    const newOrder: Record<string, any> = {};
    Object.keys(rawOrderData).forEach((key) => {
      if (rawOrderData[key] !== undefined) {
        newOrder[key] = rawOrderData[key];
      }
    });

    await adminDb.collection('orders').doc(finalId).set(newOrder);

    return NextResponse.json({
      success: true,
      orderId: finalId,
      sessionId: finalSessionId,
      roundNumber
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
