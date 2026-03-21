import { NextResponse } from 'next/server';
import { razorpay } from '@/razorpay';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { amount, plan } = await request.json();

    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}
