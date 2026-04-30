/**
 * Stripe client singleton
 * Purpose: single Stripe instance reused across all API routes
 * Import this wherever Stripe is needed server-side
 */
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
    priceId: process.env.STRIPE_PLUS_PRICE_ID!,
  },
  premium: {
    name: "Premium Plan",
    storageLimitMB: 20480,  // 20 GB
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID!,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Derive plan key from a priceId string
export function getPlanFromPriceId(priceId: string | null): PlanKey {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PLUS_PRICE_ID) return "plus";
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return "premium";
  return "free";
}
