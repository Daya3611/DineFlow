import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const secret = process.env.RAZORPAY_KEY_SECRET || "dummy_key_secret";
    const expectedSign = crypto
      .createHmac("sha256", secret)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Signature is authentic
      // we can do the backend firebase update here using firebase-admin if configured, 
      // but for demo, we respond success and frontend handles firestore update.
      return NextResponse.json({ message: "Payment verified successfully", verified: true });
    } else {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Payment verification failed' }, { status: 500 });
  }
}
