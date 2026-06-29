import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { setUserPro } from "@/lib/wordpress";

async function syncSubscriptionStatus(subscription: Stripe.Subscription, isPro: boolean) {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (!customer.deleted && customer.email) {
    await setUserPro(customer.email, isPro);
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const stripe = getStripe();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        await syncSubscriptionStatus(subscription, isActive);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionStatus(subscription, false);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("AirFTP Stripe webhook handling failed:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
