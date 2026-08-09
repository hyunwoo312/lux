export function LiveIndicator() {
  return (
    <div role="status" aria-label="Live" className="mt-1 h-0.5 overflow-hidden">
      <div className="bg-live live-sweep h-full w-1/2 rounded-full" />
    </div>
  );
}
