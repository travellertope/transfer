import { createHmac } from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

async function paystackFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message ?? "Paystack request failed");
  return json.data as T;
}

export interface PaystackTransactionInit {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/** Initializing a transaction with a `plan` code is how Paystack creates a
 *  subscription — it happens as a side effect of the first successful
 *  charge, not as a separate "create subscription" call. */
export async function initializePaystackSubscription(params: {
  email: string;
  amountKobo: number;
  planCode: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackTransactionInit> {
  return paystackFetch<PaystackTransactionInit>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      plan: params.planCode,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });
}

/** Paystack signs webhooks with an HMAC-SHA512 of the raw body using the
 *  secret key itself — there's no separate webhook signing secret like
 *  Stripe's STRIPE_WEBHOOK_SECRET. */
export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  return hash === signature;
}

/** Cancelling a Paystack subscription requires both its code and the
 *  email_token handed back when the subscription was created — Paystack
 *  treats that pair as proof of ownership instead of just trusting the
 *  authenticated API caller. */
export async function disablePaystackSubscription(subscriptionCode: string, emailToken: string): Promise<void> {
  await paystackFetch("/subscription/disable", {
    method: "POST",
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  });
}
