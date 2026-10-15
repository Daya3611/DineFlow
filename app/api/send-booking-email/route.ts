import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      bookingId,
      restaurantName,
      date,
      time,
      guestCount,
      customerName,
      customerEmail,
      customerPhone,
      address,
    } = body;

    if (!customerEmail || !bookingId) {
      return NextResponse.json(
        { error: "Missing required booking details or email" },
        { status: 400 }
      );
    }

    const bookingCode = `DF-${bookingId.slice(-6).toUpperCase()}`;

    // Send email using Resend
    let emailSent = false;
    let providerError = null;

    try {
      if (process.env.RESEND_API_KEY) {
        const { data, error } = await resend.emails.send({
          from: "DineFlow <no-reply@dineflow.pro>",
          to: customerEmail,
          subject: `Your table is confirmed at ${restaurantName || "DineFlow"} (${bookingCode})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <div style="background-color: #059669; padding: 24px; text-align: center; color: #ffffff;">
                <div style="font-size: 28px; margin-bottom: 4px;">🍽️</div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; tracking-tight: -0.5px;">DineFlow</h1>
                <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 500;">Reservation Confirmed</p>
              </div>

              <!-- Body Content -->
              <div style="padding: 24px; color: #0f172a;">
                <h2 style="font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Hi ${customerName || "Guest"},</h2>
                <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.5;">
                  Your table at <strong>${restaurantName}</strong> has been successfully reserved! Here are your booking details:
                </p>

                <!-- Booking Details Card -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                    <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Booking ID</span>
                    <strong style="font-size: 14px; color: #0f172a; font-family: monospace;">${bookingCode}</strong>
                  </div>
                  
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Restaurant:</td>
                      <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${restaurantName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date:</td>
                      <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${date}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Time:</td>
                      <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${time}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Party Size:</td>
                      <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0f172a;">${guestCount} Guests</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status:</td>
                      <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #059669; text-transform: uppercase;">CONFIRMED</td>
                    </tr>
                  </table>
                </div>

                ${
                  address
                    ? `<p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">
                        <strong>Address:</strong> ${address}
                      </p>`
                    : ""
                }

                <div style="text-align: center; margin-top: 24px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://dineflow.pro"}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                    View Reservation
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                Powered by <strong>DineFlow</strong> • Seamless Restaurant Platform
              </div>
            </div>
          `,
        });

        if (error) {
          providerError = error.message;
        } else {
          emailSent = true;
        }
      } else {
        // Mock email sent for local dev environment
        emailSent = true;
      }
    } catch (e: any) {
      providerError = e.message;
    }

    // Update Firestore booking document if adminDb is available
    if (adminDb && bookingId) {
      try {
        await adminDb.collection("reservations").doc(bookingId).update({
          confirmation_email_status: emailSent ? "sent" : "failed",
          confirmation_email_sent_at: Date.now(),
          confirmation_email_error: providerError || null,
        });
      } catch (err) {
        console.error("Failed to update reservation email status:", err);
      }
    }

    return NextResponse.json({
      success: emailSent,
      bookingCode,
      email: customerEmail,
      status: emailSent ? "sent" : "failed",
      error: providerError,
    });
  } catch (err: any) {
    console.error("Booking email API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process booking email" },
      { status: 500 }
    );
  }
}
