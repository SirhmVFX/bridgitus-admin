import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Student } from "@/lib/firestore";
import { getStripe, STRIPE_CURRENCY } from "@/lib/stripe";

/**
 * POST /api/payments/subscription
 *
 * Body (create): { action: "create", studentId, interval: "weekly"|"monthly", amountCents }
 * Body (cancel): { action: "cancel", studentId }
 */
export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const { action, studentId } = body as { action: string; studentId: string };
    if (!action || !studentId) {
      return NextResponse.json({ error: "Missing action or studentId" }, { status: 400 });
    }

    const studentRef = doc(db, "students", studentId);
    const studentSnap = await getDoc(studentRef);
    if (!studentSnap.exists()) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const student = studentSnap.data() as Student;

    if (action === "cancel") {
      const sub = student.autoPay;
      if (!sub || sub.status !== "active" || !sub.subscriptionId) {
        return NextResponse.json({ error: "No active auto-pay plan for this student." }, { status: 400 });
      }
      await stripe.subscriptions.cancel(sub.subscriptionId);
      await updateDoc(studentRef, {
        "autoPay.status": "cancelled",
        "autoPay.cancelledAt": serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return NextResponse.json({ ok: true, message: "Auto-pay cancelled." });
    }

    if (action === "create") {
      const amountCents =
        (body as { amountCents?: number; amountKobo?: number }).amountCents ??
        (body as { amountKobo?: number }).amountKobo;
      const { interval } = body as { interval: "weekly" | "monthly" };

      if (!["weekly", "monthly"].includes(interval) || !amountCents || amountCents <= 0) {
        return NextResponse.json({ error: "Invalid interval or amount." }, { status: 400 });
      }
      if (student.autoPay?.status === "active") {
        return NextResponse.json(
          { error: "This student already has an active auto-pay plan. Cancel it first." },
          { status: 400 }
        );
      }

      const customerId = student.stripeCustomerId;
      const paymentMethodId = student.stripePaymentMethod?.paymentMethodId;
      if (!customerId || !paymentMethodId) {
        return NextResponse.json(
          {
            error:
              "No saved Stripe card for this student. They must complete at least one online payment first.",
          },
          { status: 400 }
        );
      }

      // Ensure the payment method is attached and set as default
      try {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      } catch {
        // May already be attached
      }
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      const planName = `Bridgitus ${interval} — ${student.firstName} ${student.lastName} (${student.studentId})`;
      const product = await stripe.products.create({
        name: planName,
        metadata: { studentId, interval },
      });
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        default_payment_method: paymentMethodId,
        items: [
          {
            price_data: {
              currency: STRIPE_CURRENCY,
              unit_amount: Math.round(amountCents),
              recurring: { interval: interval === "weekly" ? "week" : "month" },
              product: product.id,
            },
          },
        ],
        metadata: {
          studentId,
          studentIdCode: student.studentId,
          interval,
        },
      });

      const nextPayment =
        "current_period_end" in subscription && typeof subscription.current_period_end === "number"
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : undefined;

      await updateDoc(studentRef, {
        autoPay: {
          interval,
          amountCents: Math.round(amountCents),
          amountKobo: Math.round(amountCents), // legacy alias
          subscriptionId: subscription.id,
          status: "active",
          createdAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      });

      return NextResponse.json({
        ok: true,
        message: `Auto-pay (${interval}) set up successfully.`,
        subscriptionId: subscription.id,
        nextPaymentDate: nextPayment,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Stripe subscription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Subscription request failed" },
      { status: 500 }
    );
  }
}
