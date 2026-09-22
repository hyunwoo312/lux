import type { ZodType } from "zod";
import { InvalidResponseError, parseResponse, ResponseTooLargeError } from "@/lib/net/errors";

const MAX_RESPONSE_BYTES = 5_000_000;

export async function readCappedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new ResponseTooLargeError(MAX_RESPONSE_BYTES);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function readJson<T>(
  response: Response,
  label: string,
  schema: ZodType<T>,
): Promise<T> {
  const text = await readCappedText(response);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new InvalidResponseError(label, []);
  }
  return parseResponse(label, schema, data);
}
