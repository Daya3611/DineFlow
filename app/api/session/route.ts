import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const tableNumber = searchParams.get("tableNumber");
    const sessionId = searchParams.get("sessionId");

    if (!adminDb) throw new Error("Firebase admin not initialized");

    // 1. Fetch by explicit sessionId if provided
    if (sessionId) {
      const sessionDoc = await adminDb.collection("diningSessions").doc(sessionId).get();
      if (!sessionDoc.exists) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };

      const ordersSnap = await adminDb
        .collection("orders")
        .where("sessionId", "==", sessionId)
        .get();
      const orders = ordersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

      return NextResponse.json({ session: sessionData, orders });
    }

    // 2. Lookup active session by restaurantId + tableNumber
    if (!restaurantId || !tableNumber) {
      return NextResponse.json(
        { error: "Missing required parameters (restaurantId, tableNumber)" },
        { status: 400 }
      );
    }

    const activeSnap = await adminDb
      .collection("diningSessions")
      .where("restaurantId", "==", restaurantId)
      .where("tableNumber", "==", tableNumber)
      .where("status", "in", ["active", "bill_requested", "payment_pending"])
      .limit(1)
      .get();

    if (activeSnap.empty) {
      return NextResponse.json({ session: null, orders: [] });
    }

    const sessionDoc = activeSnap.docs[0];
    const sessionData = { id: sessionDoc.id, ...sessionDoc.data() };

    const ordersSnap = await adminDb
      .collection("orders")
      .where("sessionId", "==", sessionDoc.id)
      .get();
    const orders = ordersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ session: sessionData, orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantId, tableNumber, tableId, guestCount } = body;

    if (!restaurantId || !tableNumber) {
      return NextResponse.json(
        { error: "restaurantId and tableNumber are required" },
        { status: 400 }
      );
    }

    if (!adminDb) throw new Error("Firebase admin not initialized");

    // Server-side check for existing active session to prevent race conditions
    const existingSnap = await adminDb
      .collection("diningSessions")
      .where("restaurantId", "==", restaurantId)
      .where("tableNumber", "==", tableNumber)
      .where("status", "in", ["active", "bill_requested", "payment_pending"])
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      return NextResponse.json({
        session: { id: existingDoc.id, ...existingDoc.data() },
        isNewSession: false,
      });
    }

    // Create new active session
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSession = {
      id: newSessionId,
      restaurantId,
      tableId: tableId || null,
      tableNumber,
      status: "active",
      guestCount: guestCount ? parseInt(guestCount) : 2,
      totalAmount: 0,
      createdAt: Date.now(),
      closedAt: null,
      updatedAt: Date.now(),
    };

    await adminDb.collection("diningSessions").doc(newSessionId).set(newSession);

    // Mark table as occupied
    if (tableId) {
      try {
        await adminDb.collection("tables").doc(tableId).update({ status: "occupied" });
      } catch (err) {
        console.warn("Table update warning:", err);
      }
    } else {
      const tq = await adminDb
        .collection("tables")
        .where("restaurantId", "==", restaurantId)
        .where("tableNumber", "==", tableNumber)
        .limit(1)
        .get();
      if (!tq.empty) {
        await tq.docs[0].ref.update({ status: "occupied" });
      }
    }

    return NextResponse.json({ session: newSession, isNewSession: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, status } = body;

    if (!sessionId || !status) {
      return NextResponse.json({ error: "sessionId and status required" }, { status: 400 });
    }

    if (!adminDb) throw new Error("Firebase admin not initialized");

    const sessionRef = adminDb.collection("diningSessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionData = sessionDoc.data() as any;
    const isClosing = status === "closed" || status === "paid" || status === "cancelled";

    const updateData: any = {
      status,
      updatedAt: Date.now(),
    };

    if (isClosing) {
      updateData.closedAt = Date.now();
    }

    await sessionRef.update(updateData);

    // If session closed or paid, free the table
    if (isClosing) {
      const { tableId, restaurantId, tableNumber } = sessionData;
      if (tableId) {
        try {
          await adminDb.collection("tables").doc(tableId).update({ status: "free" });
        } catch (err) {
          console.warn("Table free update warning:", err);
        }
      } else if (restaurantId && tableNumber) {
        const tq = await adminDb
          .collection("tables")
          .where("restaurantId", "==", restaurantId)
          .where("tableNumber", "==", tableNumber)
          .limit(1)
          .get();
        if (!tq.empty) {
          await tq.docs[0].ref.update({ status: "free" });
        }
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
