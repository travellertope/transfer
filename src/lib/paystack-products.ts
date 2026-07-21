export type PaidPlan = "pro";

export interface PaystackPlanDetails {
  name: string;
  monthlyNgn: number;
}

export const PAYSTACK_PLAN_DETAILS: Record<PaidPlan, PaystackPlanDetails> = {
  pro: { name: "Pro", monthlyNgn: 9900 },
};

const PLAN_ENV_KEY: Record<PaidPlan, string> = {
  pro: "PRO",
};

/** Paystack's recurring-billing unit is a Plan (created once, in the
 *  dashboard or via the API), referenced here by its plan_code — mirrors
 *  how lib/stripe.ts reads the Stripe price ID from an env var. */
export function getPaystackPlanCode(plan: PaidPlan): string | null {
  return process.env[`PAYSTACK_PLAN_${PLAN_ENV_KEY[plan]}`] ?? null;
}

export function getPlanFromPaystackPlanCode(planCode: string): PaidPlan | null {
  for (const plan of Object.keys(PLAN_ENV_KEY) as PaidPlan[]) {
    if (process.env[`PAYSTACK_PLAN_${PLAN_ENV_KEY[plan]}`] === planCode) return plan;
  }
  return null;
}
