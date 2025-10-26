import { NextResponse } from "next/server";
import { evaluateCredits } from "@/lib/credits-server";
import { getCurrentUser } from "@/lib/auth-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const fingerprint = typeof body?.clientSession === "string" ? body.clientSession : undefined;
  const user = await getCurrentUser();
  const evaluation = evaluateCredits({ userId: user?.id, fingerprint });
  return NextResponse.json(evaluation);
}
