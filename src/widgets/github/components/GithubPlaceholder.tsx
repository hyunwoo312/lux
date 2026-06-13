import type { ReactNode } from "react";

export function GithubPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="
      text-muted-foreground flex h-full items-center justify-center px-4 text-center text-sm
    ">
      {children}
    </div>
  );
}
