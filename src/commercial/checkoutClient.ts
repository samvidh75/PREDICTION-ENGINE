/**
 * commercial/checkoutClient — Frontend checkout API client.
 *
 * Handles calling the backend /api/checkout/create endpoint
 * and redirecting the user to the manual billing flow.
 */

// ─── Anonymous User ID ─────────────────────────────────────────

const ANON_USER_ID_KEY = "eq_anon_user_id";

export function getUserId(): string {
  // Allow override for testing
  const override = typeof sessionStorage !== "undefined"
    ? sessionStorage.getItem("eq_user_id_override")
    : null;
  if (override) return override;

  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(ANON_USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_USER_ID_KEY, id);
  }
  return id;
}

// ─── API Client ────────────────────────────────────────────────

export interface CreateCheckoutResult {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  error?: string;
  plan?: { id: string; name: string; pricePhp: number };
}

export async function createCheckout(
  planId: string,
  userId: string,
): Promise<CreateCheckoutResult> {
  try {
    const res = await fetch("/api/checkout/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, userId }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error ?? `Server returned ${res.status}`,
      };
    }

    return {
      success: true,
      sessionId: data.sessionId,
      checkoutUrl: data.checkoutUrl,
      plan: data.plan,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error — is the backend running?",
    };
  }
}

/**
 * Redirect to manual billing instructions page.
 */
export function redirectToCheckout(checkoutUrl: string): void {
  const w = window.open(checkoutUrl, "_blank");
  if (!w || w.closed) {
    window.location.href = checkoutUrl;
  }
}
