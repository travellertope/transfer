import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getStripe, getOrCreateCustomer } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const customer = await getOrCreateCustomer(stripe, user.email);
    const origin = req.nextUrl.origin;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: origin,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to open billing portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
