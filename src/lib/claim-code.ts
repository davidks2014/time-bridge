/**
 * src/lib/claim-code.ts
 *
 * Purpose:
 * - Generate and validate claim codes for physical visit delivery
 * - Claim codes allow receivers to fast-track claiming without
 *   uploading documents — admin already verified them in person
 *
 * Code format:
 * - 8 characters — uppercase letters and numbers
 * - Easy to read and type from a printed paper
 * - Excludes ambiguous characters: 0, O, I, 1, L
 * - Example: TB-K3X9M2QP
 */

import crypto from "crypto";

// Characters used in claim codes — excludes ambiguous 0/O, I/1/L
const CLAIM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CLAIM_CODE_LENGTH = 8;
const CLAIM_CODE_EXPIRY_DAYS = 90;

/**
 * Generates a new unique claim code
 * Format: TB-XXXXXXXX (TB prefix for Time Bridge)
 */
export function generateClaimCode(): string {
  const bytes = crypto.randomBytes(CLAIM_CODE_LENGTH);
  let code = "";

  for (let i = 0; i < CLAIM_CODE_LENGTH; i++) {
    code += CLAIM_CODE_CHARS[bytes[i] % CLAIM_CODE_CHARS.length];
  }

  // Add TB- prefix for easy identification
  return `TB-${code}`;
}

/**
 * Calculates the expiry date for a claim code
 * 90 days from generation
 */
export function getClaimCodeExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + CLAIM_CODE_EXPIRY_DAYS);
  return expiry;
}

/**
 * Checks if a claim code has expired
 */
export function isClaimCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Normalises a claim code for comparison
 * Removes spaces, dashes, converts to uppercase
 * So TB-K3X9M2QP and tbk3x9m2qp and TB K3X9 M2QP all match
 */
export function normaliseClaimCode(code: string): string {
  return code.toUpperCase().replace(/[\s\-]/g, "");
}
