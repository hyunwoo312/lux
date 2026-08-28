import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { DURATION, EASE_IN_OUT, EASE_OUT } from "@/lib/motion";
import { accentClass } from "@/widgets/core/accent";
import { getWidgetPlugin } from "@/widgets/registry";

const SPOTIFY_DASHBOARD_URL = "https://developer.spotify.com/dashboard";
const SPOTIFY_POLICY_URL =
  "https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access";
const FEEDBACK_MS = 1600;
const LINK_CLASS = "text-primary underline underline-offset-2";

const MotionButton = motion.create(Button);

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
  const transition = reduced ? { duration: 0 } : { duration: DURATION.slow, ease: EASE_OUT };

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
    try {
      await navigator.clipboard.writeText(redirectUri);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(copiedTimeout.current);
    copiedTimeout.current = window.setTimeout(() => setCopied(false), FEEDBACK_MS);
  }

  return (
    <div className={cn("relative ml-9", accentClass(getWidgetPlugin("spotify")?.tint))}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="backing"
            aria-hidden
            className="
              border-primary/30 bg-primary/10 absolute inset-0 origin-top-left rounded-2xl border
            "
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
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
          className="press cursor-pointer text-ink flex items-center gap-2 text-body font-semibold"
        >
          <motion.span
            aria-hidden
            className="flex"
            initial={false}
            animate={{ rotate: open ? 90 : 0 }}
            transition={transition}
          >
            <ChevronRight className="text-ink-3 size-3.5 shrink-0" />
          </motion.span>
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
                <p className="text-ink-3 text-caption leading-relaxed">
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
                          border-primary/40 bg-primary/15 text-ink grid size-5.5 place-items-center
                          rounded-full border text-micro font-bold
                        "
                      >
                        {index + 1}
                      </span>
                      <span className="text-ink-2 text-caption leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>

                <p className="text-ink-3 text-micro">
                  Leave the client secret empty — browser extensions use public PKCE OAuth.
                </p>

                <Field label="Redirect URI">
                  {redirectUri ? (
                    <div className="flex items-center gap-2">
                      <code
                        className="
                          border-border bg-background/40 min-w-0 flex-1 truncate rounded-lg border
                          px-3 py-2 text-caption
                        "
                      >
                        {redirectUri}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Copy redirect URI"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check className="text-primary size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-ink-3 text-caption">
                      Available once Lux is installed as an extension.
                    </p>
                  )}
                </Field>

                <Field label="Client ID">
                  <div className="flex items-center gap-2">
                    <Input
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder="Paste your Spotify Client ID"
                      aria-label="Spotify Client ID"
                      spellCheck={false}
                      autoComplete="off"
                      size="lg"
                      className="flex-1 rounded-lg"
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
                    <p className="text-micro text-warning">
                      A Spotify Client ID is 32 characters (letters and numbers).
                    </p>
                  ) : isSaved && clientId ? (
                    <p className="text-ink-3 text-micro inline-flex items-center gap-1">
                      <Check className="text-primary size-3" />
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
  transition: { duration: number; ease?: typeof EASE_OUT };
}) {
  const bare = status !== "idle";
  const content: ReactNode =
    status === "saving" ? (
      <Spinner className="text-primary" />
    ) : status === "success" ? (
      <DrawnCheck reduced={reduced} />
    ) : status === "error" ? (
      <DrawnCross reduced={reduced} />
    ) : (
      <span>{showSaved ? "Saved" : "Save"}</span>
    );

  return (
    <MotionButton
      type="button"
      variant={bare ? "ghost" : "default"}
      onClick={onSave}
      disabled={!canSave}
      initial={false}
      animate={{ width: bare ? 32 : 80 }}
      transition={transition}
      className={cn(
        "relative overflow-hidden",
        bare && "aria-disabled:opacity-100 hover:bg-transparent",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={status === "idle" ? (showSaved ? "saved" : "save") : status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : DURATION.fast }}
          className="absolute inset-0 grid place-items-center"
        >
          {content}
        </motion.span>
      </AnimatePresence>
    </MotionButton>
  );
}

function DrawnCheck({ reduced }: { reduced: boolean | null }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="text-primary size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={reduced ? false : { scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={reduced ? { duration: 0 } : { duration: DURATION.base, ease: EASE_OUT }}
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 7"
        initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={
          reduced ? { duration: 0 } : { duration: DURATION.slow, ease: EASE_IN_OUT, delay: 0.06 }
        }
      />
    </motion.svg>
  );
}

function DrawnCross({ reduced }: { reduced: boolean | null }) {
  const draw = (delay: number) => ({
    initial: reduced ? { pathLength: 1 } : { pathLength: 0 },
    animate: { pathLength: 1 },
    transition: reduced ? { duration: 0 } : { duration: DURATION.fast, ease: EASE_OUT, delay },
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
      transition={reduced ? { duration: 0 } : { duration: DURATION.base, ease: EASE_OUT }}
    >
      <motion.path d="M7 7l10 10" {...draw(0.04)} />
      <motion.path d="M17 7l-10 10" {...draw(0.16)} />
    </motion.svg>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-ink-3 text-micro font-semibold tracking-wider uppercase">{label}</span>
      {children}
    </div>
  );
}
