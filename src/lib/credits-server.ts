interface CreditResult {
  canExport: boolean;
  watermarked: boolean;
  remainingCredits: number;
  reason?: string;
}

const anonymousExports = new Map<string, boolean>();
const userCredits = new Map<string, number>();

export function getRemainingCredits(userId: string): number {
  return userCredits.get(userId) ?? 0;
}

export function setCredits(userId: string, credits: number) {
  userCredits.set(userId, credits);
}

export function evaluateCredits({
  userId,
  fingerprint
}: {
  userId?: string | null;
  fingerprint?: string;
}): CreditResult {
  if (userId) {
    const credits = getRemainingCredits(userId);
    if (credits <= 0) {
      return { canExport: false, watermarked: false, remainingCredits: credits, reason: "payment_required" };
    }
    return { canExport: true, watermarked: false, remainingCredits: credits };
  }

  if (!fingerprint) {
    return {
      canExport: false,
      watermarked: true,
      remainingCredits: 0,
      reason: "auth_required"
    };
  }

  const alreadyUsed = anonymousExports.get(fingerprint) ?? false;
  if (alreadyUsed) {
    return {
      canExport: false,
      watermarked: false,
      remainingCredits: 0,
      reason: "payment_required"
    };
  }

  return {
    canExport: true,
    watermarked: true,
    remainingCredits: 0
  };
}

export function consumeCredit({
  userId,
  fingerprint
}: {
  userId?: string | null;
  fingerprint?: string;
}): CreditResult {
  const evaluation = evaluateCredits({ userId, fingerprint });
  if (!evaluation.canExport) {
    return evaluation;
  }

  if (userId) {
    const credits = getRemainingCredits(userId);
    const nextCredits = Math.max(credits - 1, 0);
    userCredits.set(userId, nextCredits);
    return { ...evaluation, remainingCredits: nextCredits };
  }

  if (fingerprint) {
    anonymousExports.set(fingerprint, true);
  }

  return evaluation;
}
