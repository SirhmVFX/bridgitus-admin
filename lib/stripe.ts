import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
  }
  return new Stripe(key);
}

export const STRIPE_CURRENCY = (process.env.NEXT_PUBLIC_PAYMENT_CURRENCY || "aud").toLowerCase();
