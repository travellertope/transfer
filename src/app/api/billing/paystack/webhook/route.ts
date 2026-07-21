export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifyPaystackWebhookSignature } from "@/lib/paystack";
import { syncPaystackBilling } from "@/lib/wordpress";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    console.error("[paystack-webhook] signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Respond 200 immediately; process async.
  void processEvent(event);
  return NextResponse.json({ received: true });
}

async function processEvent(event: { event: string; data: Record<string, unknown> }): Promise<void> {
  try {
    if (event.event === "charge.success") {
      const data = event.data;
      const metadata = (data.metadata ?? {}) as Record<string, unknown>;
      const email = metadata.user_email;
      // Renewal charges don't carry our custom metadata (only the original
      // /transaction/initialize call does) — this naturally no-ops on
      // renewals, which is correct, since isPro is already set.
      if (typeof email === "string") {
        const customer = data.customer as { customer_code?: string } | undefined;
        await syncPaystackBilling({
          email,
          isPro: true,
          billingProvider: "paystack",
          customerCode: customer?.customer_code,
        });
      }
    }

    if (event.event === "subscription.create") {
      const data = event.data;
      const customer = data.customer as { customer_code?: string } | undefined;
      const subscriptionCode = data.subscription_code;
      const emailToken = data.email_token;
      // subscription.create's payload doesn't carry our own metadata, so
      // it's matched by the customer_code charge.success already stored —
      // if this arrives first (ordering isn't guaranteed), it's a no-op
      // and the cancel button just won't work until a later renewal fills
      // the customer_code in.
      if (customer?.customer_code && typeof subscriptionCode === "string" && typeof emailToken === "string") {
        await syncPaystackBilling({
          customerCode: customer.customer_code,
          subscriptionCode,
          emailToken,
        });
      }
    }

    if (event.event === "subscription.disable") {
      const data = event.data;
      const subscriptionCode = data.subscription_code;
      if (typeof subscriptionCode === "string") {
        await syncPaystackBilling({ subscriptionCode, isPro: false });
      }
    }
  } catch (err) {
    console.error("[paystack-webhook] processEvent error:", err);
  }
}
