import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const docRef = adminDb.collection("otps").doc(email);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "No OTP request found for this email" }, { status: 400 });
    }

    const record = snapshot.data() as { otp: string; expiresAt: number };

    if (record.expiresAt < Date.now()) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    // OTP matched, delete it so it can't be reused
    await docRef.delete();

    // Save or update user in DB
    const userRef = adminDb.collection("users").doc(email);
    const userSnap = await userRef.get();
    
    // In a full SaaS, we'd potentially look up their role here (e.g. restaurant_owner vs customer)
    if (!userSnap.exists) {
      await userRef.set({
        email,
        role: "customer", // default role
        createdAt: Date.now(),
        lastLogin: Date.now(),
      });
    } else {
      await userRef.update({
        lastLogin: Date.now(),
      });
    }

    return NextResponse.json({ success: true, user: { email, role: userSnap.exists ? userSnap.data()?.role : "customer" } });
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
