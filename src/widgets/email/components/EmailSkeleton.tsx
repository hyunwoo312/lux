import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 5;

export function EmailSkeleton() {
  return (
    <div className="h-full min-h-0 overflow-hidden px-0.5">
      <span role="status" className="sr-only">
        Loading mail
      </span>
      <div className="flex flex-col gap-0.5" aria-hidden>
        {Array.from({ length: ROWS }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-2.5 py-2.5">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-2.5 w-1/3" />
              <Skeleton className="h-2.5 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
