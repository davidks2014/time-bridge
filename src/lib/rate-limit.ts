/**
 * src/lib/rate-limit.ts
 *
 * Purpose:
 * - Simple database-backed rate limiting
 * - Used to prevent brute force NRIC enumeration on /claim
 * - After MAX_ATTEMPTS failures in WINDOW_MINUTES, blocks further attempts
 *
 * Design:
 * - Stores attempt counts in the RateLimit table
 * - Window resets after WINDOW_MINUTES
 * - Successful attempts reset the counter
 */

import { prisma } from "@/lib/prisma";

// Configuration
const MAX_ATTEMPTS = 3;    // Block after 3 failed attempts
const WINDOW_MINUTES = 10; // Reset window after 10 minutes

type RateLimitResult = {
  allowed: boolean;
  attemptsRemaining: number;
  minutesUntilReset: number;
};

/**
 * Records a failed attempt and checks if the IP should be blocked.
 * Returns whether the attempt is allowed.
 */
export async function checkRateLimit(
  ipAddress: string,
  action: string
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

  const existing = await prisma.rateLimit.findUnique({
    where: {
      ipAddress_action: { ipAddress, action },
    },
  });

  // No record — first attempt, always allowed
  if (!existing) {
    return {
      allowed: true,
      attemptsRemaining: MAX_ATTEMPTS - 1,
      minutesUntilReset: WINDOW_MINUTES,
    };
  }

  // Window has expired — reset and allow
  if (existing.windowStart < windowStart) {
    await prisma.rateLimit.update({
      where: { ipAddress_action: { ipAddress, action } },
      data: { attempts: 1, windowStart: now },
    });

    return {
      allowed: true,
      attemptsRemaining: MAX_ATTEMPTS - 1,
      minutesUntilReset: WINDOW_MINUTES,
    };
  }

  // Window is active — check attempt count
  if (existing.attempts >= MAX_ATTEMPTS) {
    const resetTime = new Date(existing.windowStart.getTime() + WINDOW_MINUTES * 60 * 1000);
    const minutesUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / 60000);

    return {
      allowed: false,
      attemptsRemaining: 0,
      minutesUntilReset,
    };
  }

  // Under the limit — allow but note remaining count
  return {
    allowed: true,
    attemptsRemaining: MAX_ATTEMPTS - existing.attempts - 1,
    minutesUntilReset: WINDOW_MINUTES,
  };
}

/**
 * Records a failed attempt for an IP address.
 * Call this after a failed search.
 */
export async function recordFailedAttempt(
  ipAddress: string,
  action: string
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

  const existing = await prisma.rateLimit.findUnique({
    where: { ipAddress_action: { ipAddress, action } },
  });

  if (!existing || existing.windowStart < windowStart) {
    await prisma.rateLimit.upsert({
      where: { ipAddress_action: { ipAddress, action } },
      create: { ipAddress, action, attempts: 1, windowStart: now },
      update: { attempts: 1, windowStart: now },
    });
  } else {
    await prisma.rateLimit.update({
      where: { ipAddress_action: { ipAddress, action } },
      data: { attempts: { increment: 1 } },
    });
  }
}

/**
 * Resets the rate limit counter for an IP.
 * Call this after a successful search.
 */
export async function resetRateLimit(
  ipAddress: string,
  action: string
): Promise<void> {
  await prisma.rateLimit.deleteMany({
    where: { ipAddress, action },
  });
}
