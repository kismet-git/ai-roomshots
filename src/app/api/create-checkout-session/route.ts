import { NextResponse } from "next/server";
import Stripe from "stripe";
import { assertEnv } from "@/lib/validation";

const stripe = new Stripe(assertEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2022-11-15"
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const successUrl = body?.successUrl;
    const cancelUrl = body?.cancelUrl;

    if (typeof successUrl !== "string" || typeof cancelUrl !== "string") {
      return NextResponse.json(
        { error: "validation_error", message: "successUrl and cancelUrl are required" },
        { status: 400 }
      );
    }

    const priceId = assertEnv("STRIPE_PRICE_CREDIT_PACK");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    if (!session.url) {
      throw new Error("Stripe session missing URL");
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("/api/create-checkout-session failure", error);
    return NextResponse.json(
      {
        error: "stripe_error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
