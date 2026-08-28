import { z } from "zod";
import { RELAY_BASE_URL } from "@/lib/relay";
import { FEEDBACK_TIMEOUT_MS, parseResponse, withTimeout } from "@/lib/net";
import type { FeedbackSubmission, SubmitResult } from "@/feedback/types";

const ENDPOINT = `${RELAY_BASE_URL}/feedback/submit`;

const RETRYABLE_MESSAGE = "Couldn’t reach us just now. Your message is safe — try again.";
const TERMINAL_MESSAGE = "Something went wrong sending that. Your message is safe.";
const DISABLED_MESSAGE = "Feedback is paused right now. Please try again later.";
const UNCONFIRMED_MESSAGE = "We couldn’t confirm that went through — please don’t resend just yet.";

const relayResponseSchema = z.object({
  ok: z.boolean().optional(),
  id: z.string().optional(),
  error: z.string().optional(),
  retryable: z.boolean().optional(),
});

type RelayResponse = z.infer<typeof relayResponseSchema>;

function failure(retryable: boolean, message: string): SubmitResult {
  return { ok: false, retryable, message };
}

export async function submitFeedback(submission: FeedbackSubmission): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
      signal: withTimeout(undefined, FEEDBACK_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return failure(false, UNCONFIRMED_MESSAGE);
    }
    return failure(true, RETRYABLE_MESSAGE);
  }

  let payload: RelayResponse;
  try {
    payload = parseResponse("feedback", relayResponseSchema, await response.json());
  } catch {
    return failure(false, response.ok ? UNCONFIRMED_MESSAGE : TERMINAL_MESSAGE);
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
