import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getStripe, getOrCreateCustomer } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();
    const customer = await getOrCreateCustomer(stripe, user.email);
    const origin = req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?upgraded=1`,
      cancel_url: `${origin}/#pricing`,
      client_reference_id: String(user.id),
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
