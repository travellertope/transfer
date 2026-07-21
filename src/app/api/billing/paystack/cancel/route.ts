import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { disablePaystackSubscription } from "@/lib/paystack";
import { lookupPaystackSubscription, syncPaystackBilling } from "@/lib/wordpress";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { subscriptionCode, emailToken } = await lookupPaystackSubscription(user.email);
  if (!subscriptionCode || !emailToken) {
    return NextResponse.json({ error: "No active Paystack subscription found." }, { status: 404 });
  }

  try {
    await disablePaystackSubscription(subscriptionCode, emailToken);
    await syncPaystackBilling({ email: user.email, isPro: false });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to cancel subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
