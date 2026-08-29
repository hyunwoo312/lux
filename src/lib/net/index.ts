export {
  classifyLoadError,
  describeFailure,
  ensureOk,
  type FailureCopy,
  type FailureTone,
  HttpError,
  InvalidResponseError,
  loadErrorMessage,
  parseResponse,
  RateLimitError,
  rateLimitError,
  ResponseTooLargeError,
  retryAfterMs,
  TemporaryAuthError,
} from "@/lib/net/errors";
export { FEEDBACK_TIMEOUT_MS, withTimeout } from "@/lib/net/policy";
export { fetchTokenEndpoint } from "@/lib/net/token-endpoint";
export { isOnline, subscribeOnline } from "@/lib/net/online";
export { readCappedText } from "@/lib/net/body";
