import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TYPE } from "@/lib/type";
import { panelVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { exportSettings } from "@/lib/backup";
import { remove } from "@/lib/storage";

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { detail: string | null };

function detailOf(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message || error.name;
  return String(error);
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { detail: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { detail: detailOf(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.setState({ detail: `${detailOf(error)}\n${info.componentStack ?? ""}`.trimEnd() });
  }

  render() {
    if (this.state.detail === null) return this.props.children;
    return <CrashCard detail={this.state.detail} />;
  }
}

type ResetStage = "idle" | "confirming";

function CrashCard({ detail }: { detail: string }) {
  const [stage, setStage] = useState<ResetStage>("idle");
  const [backupError, setBackupError] = useState<string | null>(null);

  useEffect(() => {
    if (stage === "idle") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStage("idle");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stage]);

  const exportBackup = () => {
    setBackupError(null);
    exportSettings().catch(() => setBackupError("Couldn't save a backup file."));
  };

  const resetLayout = () => {
    remove("dashboard")
      .catch(() => undefined)
      .finally(() => window.location.reload());
  };

  const caption =
    stage === "confirming"
      ? "This clears where your widgets sit on the grid. Their content is kept."
      : "Reload first. Reset only if the page keeps failing.";

  return (
    <div className="bg-background flex h-dvh items-center justify-center p-6">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-3xl border p-6 shadow-lg">
        <div className="flex items-center gap-2.5">
          <TriangleAlert className="text-destructive size-5 shrink-0" aria-hidden />
          <h1 className="text-body-lg font-semibold">Lux hit an error</h1>
        </div>

        <p className="text-ink-3 mt-2 text-body">
          The page stopped before it could finish loading. Everything you have saved is still on
          this device, and nothing has been sent anywhere.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button autoFocus onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button variant="outline" onClick={exportBackup}>
            Export backup
          </Button>
          {stage === "confirming" ? (
            <>
              <Button variant="destructive" onClick={resetLayout}>
                Reset layout
              </Button>
              <Button variant="ghost" onClick={() => setStage("idle")}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setStage("confirming")}>
              Reset layout
            </Button>
          )}
        </div>

        <div className="mt-2 grid text-caption">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={stage}
              variants={panelVariants(false)}
              initial="hidden"
              animate="show"
              exit="exit"
              className="text-ink-3 col-start-1 row-start-1"
            >
              {caption}
            </motion.p>
          </AnimatePresence>
        </div>

        {backupError && <p className="text-destructive mt-2 text-caption">{backupError}</p>}

        <CrashDetail detail={detail} />
      </div>
    </div>
  );
}

type CopyStage = "idle" | "copied" | "failed";

function CrashDetail({ detail }: { detail: string }) {
  const [stage, setStage] = useState<CopyStage>("idle");

  useEffect(() => {
    if (stage !== "copied") return;
    const timer = window.setTimeout(() => setStage("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [stage]);

  const copyDetail = () => {
    navigator.clipboard.writeText(detail).then(
      () => setStage("copied"),
      () => setStage("failed"),
    );
  };

  return (
    <div className="mt-4 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-ink-3 text-micro font-medium tracking-wide uppercase">
          What went wrong
        </span>
        <Button variant="ghost" onClick={copyDetail} aria-label="Copy error details">
          {stage === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
          {stage === "copied" ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className={cn(TYPE.rowSubtitle, "mt-1 max-h-32 overflow-auto whitespace-pre-wrap")}>
        {detail}
      </pre>
      {stage === "failed" && (
        <p className="text-destructive mt-1 text-caption">
          Couldn't copy — select the text instead.
        </p>
      )}
    </div>
  );
}
