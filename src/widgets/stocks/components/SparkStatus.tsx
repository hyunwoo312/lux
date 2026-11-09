export function SparkStatus({
  loading,
  failed,
  loadingLabel,
  failedLabel,
  onRetry,
}: {
  loading: boolean;
  failed: boolean;
  loadingLabel: string;
  failedLabel: string;
  onRetry: () => void;
}) {
  if (failed) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring text-warning cursor-pointer rounded-md p-2 text-caption"
      >
        {failedLabel} · Retry
      </button>
    );
  }
  if (!loading) return null;
  return (
    <p role="status" className="text-ink-3 px-2 text-caption">
      {loadingLabel}
    </p>
  );
}
