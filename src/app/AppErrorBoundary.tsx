import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/type";
import { Component, useState, type ReactNode } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportSettings } from "@/lib/backup";
import { remove } from "@/lib/storage";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  message: string | null;
};

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { message: messageOf(error) };
  }

  render() {
    if (this.state.message === null) return this.props.children;
    return <CrashCard message={this.state.message} />;
  }
}

function CrashCard({ message }: { message: string }) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const exportBackup = () => {
    setActionError(null);
    exportSettings().catch(() => setActionError("Couldn't save a backup file."));
  };

  const resetLayout = () => {
    remove("dashboard")
      .catch(() => undefined)
      .finally(() => window.location.reload());
  };

  return (
    <div className="bg-background flex h-dvh items-center justify-center p-6">
      <div className="bg-card text-card-foreground w-full max-w-md rounded-2xl border p-6 shadow-lg">
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
          {confirmingReset ? (
            <>
              <Button variant="destructive" onClick={resetLayout}>
                Reset layout
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingReset(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmingReset(true)}>
              Reset layout
            </Button>
          )}
        </div>

        <p className="text-ink-3 mt-2 text-caption">
          {confirmingReset
            ? "This clears where your widgets sit on the grid. Their content is kept."
            : "Reload first. Reset only if the page keeps failing."}
        </p>

        {actionError && <p className="text-destructive mt-2 text-caption">{actionError}</p>}

        <CrashDetail message={message} />
      </div>
    </div>
  );
}

function CrashDetail({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copyMessage = () => {
    navigator.clipboard.writeText(message).then(
      () => setCopied(true),
      () => setFailed(true),
    );
  };

  return (
    <div className="mt-4 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-ink-3 text-micro font-medium tracking-wide uppercase">
          What went wrong
        </span>
        <Button variant="ghost" onClick={copyMessage} aria-label="Copy error message">
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className={cn(TYPE.rowSubtitle, "mt-1 max-h-32 overflow-auto whitespace-pre-wrap")}>
        {message}
      </pre>
      {failed && (
        <p className="text-destructive mt-1 text-caption">
          Couldn't copy — select the text instead.
        </p>
      )}
    </div>
  );
}
