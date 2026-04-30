/**
 * API: POST /api/stripe/webhook
 *
 * Purpose: Handle Stripe webhook events after payment.
 * Stripe calls this URL automatically after checkout, renewal, cancellation.
 *
 * Events handled:
 * - checkout.session.completed → activate subscription, update storageLimitMB
 * - customer.subscription.updated → plan change or renewal
 * - customer.subscription.deleted → downgrade to free, reset storageLimitMB to 500
 *
 * CRITICAL: Must use raw request body for Stripe signature verification.
 * Do NOT parse body with req.json() — use req.text() then Buffer.from().
 */
import { stripe, PLANS, getPlanFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Required: disable Next.js body parsing so we get raw body for Stripe signature
export const config = { api: { bodyParser: false } };

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "No signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // Payment successful — activate the subscription
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // Get subscription details to find the priceId
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id ?? null;
        const planKey = getPlanFromPriceId(priceId);
        const plan = PLANS[planKey];

        // Update user: set subscription fields + new storage limit
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            stripePlanName: planKey === "free" ? null : planKey,
            storageLimitMB: plan.storageLimitMB,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        // Plan change or renewal
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id ?? null;
        const planKey = getPlanFromPriceId(priceId);
        const plan = PLANS[planKey];

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            stripePlanName: planKey === "free" ? null : planKey,
            storageLimitMB: plan.storageLimitMB,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        // Subscription cancelled — downgrade to free
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripePlanName: null,
            storageLimitMB: PLANS.free.storageLimitMB, // back to 500 MB
          },
        });
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return Response.json({ error: "Webhook handler error." }, { status: 500 });
  }
}
