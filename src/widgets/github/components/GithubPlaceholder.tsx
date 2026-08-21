import type { ReactNode } from "react";

export function GithubPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="text-ink-3 flex h-full items-center justify-center px-4 text-center text-body">
      {children}
    </div>
  );
}
