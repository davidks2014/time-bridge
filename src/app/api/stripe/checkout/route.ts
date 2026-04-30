/**
 * API: POST /api/stripe/checkout
 *
 * Purpose: Create a Stripe Checkout session for plan upgrade.
 * Called when user clicks "Upgrade" on /upgrade page.
 *
 * Request body: { priceId: string }
 * Response: { url: string } — redirect user to this Stripe Checkout URL
 *
 * Flow:
 * 1. Verify user is logged in and APPROVED
 * 2. Find or create Stripe customer for this user
 * 3. Create Checkout session with the selected priceId
 * 4. Return the session URL for redirect
 */
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, PLANS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Not logged in." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, email: true, name: true, stripeCustomerId: true, verificationStatus: true },
    });

    if (!user) return Response.json({ error: "User not found." }, { status: 404 });
    if (user.verificationStatus !== "APPROVED") {
      return Response.json({ error: "Account not approved." }, { status: 403 });
    }

    const body = await req.json();
    const { priceId } = body;

    // Validate priceId is one of our known plans
    const validPriceIds = ["price_1TRuZyE4BN2ZuVDKdGYxy5Ei", "price_1TRudjE4BN2ZuVDK1cF5GyFt"];
    if (!priceId || !validPriceIds.includes(priceId)) {
      return Response.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    // Find or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/upgrade`,
      metadata: { userId: user.id },
    });

    return Response.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("POST /api/stripe/checkout error:", err);
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
