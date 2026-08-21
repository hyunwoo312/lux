export function BrowserMessage({ children }: { children: string }) {
  return (
    <div className="text-ink-4 flex h-full items-center justify-center text-body">{children}</div>
  );
}
