import { z } from "zod";
import { integrationFetch } from "@/integrations";
import { ensureOk, RateLimitError } from "@/lib/net";

export const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
export const NOTIFICATIONS_ENDPOINT = "https://api.github.com/notifications";
export const GITHUB_JSON_HEADERS = { Accept: "application/vnd.github+json" };

const graphqlErrorsSchema = z.object({
  errors: z.array(z.object({ type: z.string().optional(), message: z.string().optional() })).min(1),
});

export async function graphql(query: string, signal?: AbortSignal): Promise<unknown> {
  const response = await integrationFetch("github", GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });
  ensureOk(response, "GitHub request failed");
  const body: unknown = await response.json();
  const parsed = graphqlErrorsSchema.safeParse(body);
  if (parsed.success) {
    const { errors } = parsed.data;
    if (errors.some((error) => error.type === "RATE_LIMITED")) {
      throw new RateLimitError(0);
    }
    throw new Error(errors[0]?.message ?? "GitHub request failed");
  }
  return body;
}
