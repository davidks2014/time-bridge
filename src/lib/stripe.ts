/**
 * Stripe client singleton
 * Purpose: single Stripe instance reused across all API routes
 * Import this wherever Stripe is needed server-side
 */
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
export const stripe = new Stripe(stripeKey || "sk_placeholder_for_build", {
  apiVersion: "2026-04-22.dahlia",
});

// Plan config — source of truth for plan limits and price IDs
export const PLANS = {
  free: {
    name: "Free",
    storageLimitMB: 500,
    priceId: null,
  },
  plus: {
    name: "Plus Plan",
    storageLimitMB: 5120,   // 5 GB
    priceId: "price_1TRuZyE4BN2ZuVDKdGYxy5Ei",
  },
  premium: {
    name: "Premium Plan",
    storageLimitMB: 20480,  // 20 GB
    priceId: "price_1TRudjE4BN2ZuVDK1cF5GyFt",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Derive plan key from a priceId string
export function getPlanFromPriceId(priceId: string | null): PlanKey {
  if (!priceId) return "free";
  if (priceId === "price_1TRuZyE4BN2ZuVDKdGYxy5Ei") return "plus";
  if (priceId === "price_1TRudjE4BN2ZuVDK1cF5GyFt") return "premium";
  return "free";
}
