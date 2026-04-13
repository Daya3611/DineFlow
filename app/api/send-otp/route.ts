import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Input validation for email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Firestore with expiration (5 mins)
    await adminDb.collection("otps").doc(email).set({
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now(),
    });

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "DineFlow <no-reply@dineflow.pro>", // replace with your domain in production e.g. hello@dineflow.com
      to: email, // Resend free tier only allows sending to the registered verify email, until a domain is added.
      subject: "DineFlow Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 30px; border: 1px solid #eaeaea; border-radius: 12px; max-width: 480px; margin: auto; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="width: 50px; height: 50px; background-color: #d1fae5; color: #059669; border-radius: 12px; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 24px;">🍽️</div>
            <h1 style="color: #111827; font-size: 22px; margin-top: 15px; margin-bottom: 5px;">Welcome to DineFlow</h1>
            <p style="color: #6b7280; font-size: 15px; margin: 0;">Complete your login to proceed</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 24px; border-radius: 12px; text-align: center; margin: 25px 0; border: 1px solid #f3f4f6;">
            <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 10px; margin-top: 0; font-weight: 600;">Your Verification Code</p>
            <strong style="font-size: 36px; letter-spacing: 8px; color: #0f9d6a; display: block;">${otp}</strong>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; line-height: 1.5; margin-bottom: 20px;">
            This code will expire in <strong>5 minutes</strong>. If you didn't request this code, you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} DineFlow. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend delivery error:", error);
      return NextResponse.json({ error: error.message || "Failed to send email via Resend" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Send OTP error:", err);
    return NextResponse.json({ error: "Failed to process OTP request", details: err.message }, { status: 500 });
  }
}
