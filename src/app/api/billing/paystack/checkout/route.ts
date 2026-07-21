import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { initializePaystackSubscription } from "@/lib/paystack";
import { getPaystackPlanCode, PAYSTACK_PLAN_DETAILS } from "@/lib/paystack-products";

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const planCode = getPaystackPlanCode("pro");
  if (!planCode) {
    return NextResponse.json(
      { error: "Paystack billing is not configured." },
      { status: 503 }
    );
  }

  const origin = req.nextUrl.origin;
  const amountKobo = Math.round(PAYSTACK_PLAN_DETAILS.pro.monthlyNgn * 100);

  try {
    const txn = await initializePaystackSubscription({
      email: user.email,
      amountKobo,
      planCode,
      callbackUrl: `${origin}/dashboard/billing?upgraded=1`,
      metadata: { user_email: user.email },
    });

    return NextResponse.json({ url: txn.authorization_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
