import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export async function getOrCreateCustomer(
  stripe: Stripe,
  email: string
): Promise<Stripe.Customer> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data[0]) return existing.data[0];
  return stripe.customers.create({ email });
}
