import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPOTIFY_DASHBOARD_URL = "https://developer.spotify.com/dashboard";
const SPOTIFY_POLICY_URL =
  "https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access";
const FEEDBACK_MS = 1600;
const EASE = [0.22, 1, 0.36, 1] as const;
const LINK_CLASS = "text-emerald-700 underline underline-offset-2 dark:text-emerald-300";

const STEPS: ReactNode[] = [
  <>
    In the{" "}
    <a href={SPOTIFY_DASHBOARD_URL} target="_blank" rel="noreferrer" className={LINK_CLASS}>
      Spotify Developer Dashboard
    </a>
    , create an app named Lux.
  </>,
  "Add a short description, like “Personal dashboard playback controls.”",
  "Enable Web API, then add the redirect URI below.",
  "Open the app’s settings, copy its Client ID, then paste and save it here.",
];

type SaveStatus = "idle" | "saving" | "success" | "error";

type SpotifySetupProps = {
  clientId: string | undefined;
  redirectUri: string | null;
  onSave: (clientId: string) => Promise<void>;
};

export function SpotifySetup({ clientId, redirectUri, onSave }: SpotifySetupProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(!clientId);
  const [value, setValue] = useState(clientId ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [copied, setCopied] = useState(false);
  const statusTimeout = useRef<number | undefined>(undefined);
  const copiedTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    setValue(clientId ?? "");
  }, [clientId]);

  useEffect(
    () => () => {
      window.clearTimeout(statusTimeout.current);
      window.clearTimeout(copiedTimeout.current);
    },
    [],
  );

  const trimmed = value.trim();
  const isSaved = trimmed === (clientId ?? "");
  const formatInvalid = trimmed.length > 0 && !/^[0-9a-f]{32}$/i.test(trimmed);
  const canSave = trimmed.length > 0 && !isSaved && !formatInvalid && status === "idle";
  const transition = reduced ? { duration: 0 } : { duration: 0.32, ease: EASE };

  async function handleSave() {
    if (!canSave) return;
    setStatus("saving");
    try {
      await onSave(trimmed);
      setStatus("success");
    } catch {
      setStatus("error");
    }
    window.clearTimeout(statusTimeout.current);
    statusTimeout.current = window.setTimeout(() => setStatus("idle"), FEEDBACK_MS);
  }

  async function handleCopy() {
    if (!redirectUri) return;
    await navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    window.clearTimeout(copiedTimeout.current);
    copiedTimeout.current = window.setTimeout(() => setCopied(false), FEEDBACK_MS);
  }

  return (
    <div className="relative ml-9">
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="backing"
            aria-hidden
            className="
              absolute inset-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10
              dark:border-emerald-400/30 dark:bg-emerald-500/20
            "
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            style={{ transformOrigin: "top left" }}
            transition={transition}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="relative flex flex-col"
        initial={false}
        animate={{
          paddingTop: open ? "0.75rem" : "0rem",
          paddingBottom: open ? "0.75rem" : "0rem",
          paddingLeft: open ? "0.75rem" : "0rem",
          paddingRight: open ? "0.75rem" : "0rem",
        }}
        transition={transition}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="text-foreground flex items-center gap-2 text-sm font-semibold"
        >
          <SetupTriangle open={open} transition={transition} />
          How to set up Spotify
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={transition}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 pt-3">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Spotify limits third-party Web API access, so Lux connects through your own
                  Spotify Developer app instead of a shared one.{" "}
                  <a
                    href={SPOTIFY_POLICY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(LINK_CLASS, "inline-flex items-center gap-0.5")}
                  >
                    Why this is required
                    <ExternalLink className="size-3" />
                  </a>
                </p>

                <ol className="flex flex-col gap-2">
                  {STEPS.map((step, index) => (
                    <li
                      key={index}
                      className="grid grid-cols-[1.375rem_minmax(0,1fr)] items-start gap-2.5"
                    >
                      <span
                        aria-hidden
                        className="
                          grid size-[1.375rem] place-items-center rounded-full border
                          border-emerald-500/40 bg-emerald-500/15 text-[0.66rem] font-bold
                          text-emerald-700
                          dark:border-emerald-300/40 dark:bg-emerald-400/15 dark:text-emerald-200
                        "
                      >
                        {index + 1}
                      </span>
                      <span className="text-foreground/85 text-xs leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>

                <p className="text-muted-foreground text-2xs">
                  Leave the client secret empty — browser extensions use public PKCE OAuth.
                </p>

                <Field label="Redirect URI">
                  {redirectUri ? (
                    <div className="flex items-center gap-2">
                      <code className="
                        border-border bg-background/40 min-w-0 flex-1 truncate rounded-lg border
                        px-3 py-2 text-xs
                      ">
                        {redirectUri}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-9 shrink-0"
                        aria-label="Copy redirect URI"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check className="size-4 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Available once Lux is installed as an extension.
                    </p>
                  )}
                </Field>

                <Field label="Client ID">
                  <div className="flex items-center gap-2">
                    <input
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder="Paste your Spotify Client ID"
                      spellCheck={false}
                      autoComplete="off"
                      className="
                        border-border bg-background/40 text-foreground
                        placeholder:text-muted-foreground/60
                        focus-visible:border-emerald-500 focus-visible:ring-emerald-500/40
                        min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none
                        focus-visible:ring-2
                      "
                    />
                    <SaveButton
                      status={status}
                      canSave={canSave}
                      showSaved={isSaved && trimmed.length > 0}
                      onSave={handleSave}
                      reduced={reduced}
                      transition={transition}
                    />
                  </div>
                  {formatInvalid ? (
                    <p className="text-2xs text-warning">
                      A Spotify Client ID is 32 characters (letters and numbers).
                    </p>
                  ) : isSaved && clientId ? (
                    <p className="text-muted-foreground text-2xs inline-flex items-center gap-1">
                      <Check className="size-3 text-emerald-600 dark:text-emerald-300" />
                      Saved
                    </p>
                  ) : null}
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function SetupTriangle({
  open,
  transition,
}: {
  open: boolean;
  transition: { duration: number; ease?: typeof EASE };
}) {
  return (
    <motion.svg
      viewBox="0 0 12 12"
      aria-hidden
      className="size-2.5 shrink-0 fill-current"
      initial={false}
      animate={{ rotate: open ? 90 : 0 }}
      transition={transition}
      style={{ transformOrigin: "center" }}
    >
      <path d="M4 2 L9.5 6 L4 10 Z" />
    </motion.svg>
  );
}

function SaveButton({
  status,
  canSave,
  showSaved,
  onSave,
  reduced,
  transition,
}: {
  status: SaveStatus;
  canSave: boolean;
  showSaved: boolean;
  onSave: () => void;
  reduced: boolean | null;
  transition: { duration: number; ease?: typeof EASE };
}) {
  const bare = status !== "idle";
  const content: ReactNode =
    status === "saving" ? (
      <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-300" />
    ) : status === "success" ? (
      <DrawnCheck reduced={reduced} />
    ) : status === "error" ? (
      <DrawnCross reduced={reduced} />
    ) : (
      <span>{showSaved ? "Saved" : "Save"}</span>
    );

  return (
    <motion.button
      type="button"
      onClick={onSave}
      disabled={!canSave}
      initial={false}
      animate={{ width: bare ? 32 : 80 }}
      transition={transition}
      className={cn(
        `
          relative inline-flex h-8 shrink-0 cursor-pointer items-center justify-center
          overflow-hidden rounded-md text-sm font-medium outline-none transition-colors
          focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2
          focus-visible:ring-offset-background
          disabled:pointer-events-none
          [&_svg]:size-4 [&_svg]:shrink-0
        `,
        bare
          ? "bg-transparent"
          : "bg-emerald-500 hover:bg-emerald-600 px-3 text-white disabled:opacity-50",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={status === "idle" ? (showSaved ? "saved" : "save") : status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
          className="absolute inset-0 grid place-items-center"
        >
          {content}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function DrawnCheck({ reduced }: { reduced: boolean | null }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-5 text-emerald-600 dark:text-emerald-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduced ? false : { scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 7"
        initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.65, 0, 0.35, 1], delay: 0.06 }}
      />
    </motion.svg>
  );
}

function DrawnCross({ reduced }: { reduced: boolean | null }) {
  const draw = (delay: number) => ({
    initial: reduced ? { pathLength: 1 } : { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: reduced ? { duration: 0 } : { duration: 0.16, ease: "easeOut" as const, delay },
  });
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="text-destructive size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      initial={reduced ? false : { scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
    >
      <motion.path d="M7 7l10 10" {...draw(0.04)} />
      <motion.path d="M17 7l-10 10" {...draw(0.16)} />
    </motion.svg>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-2xs font-semibold tracking-wider uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}
