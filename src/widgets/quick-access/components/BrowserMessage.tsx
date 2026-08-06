export function BrowserMessage({ children }: { children: string }) {
  return (
    <div className="text-muted-foreground/60 flex h-full items-center justify-center text-sm">
      {children}
    </div>
  );
}
