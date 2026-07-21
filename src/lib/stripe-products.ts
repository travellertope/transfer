export interface PlanDetails {
  name: string;
  monthlyUsd: number;
}

/** BluuSync has a single paid tier — the actual charge amount lives on the
 *  Stripe Price object referenced by STRIPE_PRICE_ID, not here. This is
 *  display-only, mirrored by lib/paystack-products.ts's monthlyNgn so the
 *  two currencies can't drift apart in the UI. */
export const PLAN_DETAILS: Record<"pro", PlanDetails> = {
  pro: { name: "Pro", monthlyUsd: 14 },
};
