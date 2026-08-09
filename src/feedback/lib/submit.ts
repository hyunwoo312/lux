import { RELAY_BASE_URL } from "@/lib/links";
import type { FeedbackSubmission, SubmitResult } from "@/feedback/types";

const ENDPOINT = `${RELAY_BASE_URL}/feedback/submit`;
const REQUEST_TIMEOUT_MS = 15_000;

const RETRYABLE_MESSAGE = "Couldn’t reach us just now. Your message is safe — try again.";
const TERMINAL_MESSAGE = "Something went wrong sending that. Your message is safe.";
const DISABLED_MESSAGE = "Feedback is paused right now. Please try again later.";

type RelayResponse = { ok?: boolean; id?: string; error?: string; retryable?: boolean };

function failure(retryable: boolean, message: string): SubmitResult {
  return { ok: false, retryable, message };
}

export async function submitFeedback(
  submission: FeedbackSubmission,
  signal?: AbortSignal,
): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
        : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return failure(true, RETRYABLE_MESSAGE);
  }

  let payload: RelayResponse;
  try {
    payload = (await response.json()) as RelayResponse;
  } catch {
    payload = {};
  }

  if (response.ok && payload.ok && typeof payload.id === "string") {
    return { ok: true, id: payload.id };
  }

  if (payload.error === "disabled") return failure(false, DISABLED_MESSAGE);

  return failure(
    payload.retryable === true,
    payload.retryable ? RETRYABLE_MESSAGE : TERMINAL_MESSAGE,
  );
}
