import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/onboarding/useOnboardingStore";

type Placement = "below" | "left";
type Step = {
  spotlight: string[];
  anchor: string;
  placement: Placement;
  aboveOf?: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    spotlight: ["toolbar"],
    anchor: "toolbar",
    placement: "below",
    title: "Your toolbar",
    body: "Switch the theme, edit your layout, and open settings — all from here.",
  },
  {
    spotlight: ["grid", "add-widget"],
    anchor: "toolbar",
    placement: "left",
    aboveOf: "grid",
    title: "Your dashboard",
    body: "Your widgets live here. Add more with the + button, then drag and resize to make it yours.",
  },
  {
    spotlight: ["settings"],
    anchor: "settings",
    placement: "below",
    title: "Connect your accounts",
    body: "Calendar, Spotify, GitHub, and AniList sign in from Settings → Accounts. Your data stays in this browser.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
const GAP = 14;
const CARD_W = 288;

function measureId(id: string): Rect | null {
  const el = document.querySelector(`[data-tour="${id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function Tour() {
  const reduced = useReducedMotion();
  const active = useOnboardingStore((s) => s.tourActive);
  const step = useOnboardingStore((s) => s.step);
  const next = useOnboardingStore((s) => s.next);
  const prev = useOnboardingStore((s) => s.prev);
  const backToWelcome = useOnboardingStore((s) => s.backToWelcome);
  const stop = useOnboardingStore((s) => s.stop);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [cardHeight, setCardHeight] = useState(160);
  const cardRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [active, step]);

  useLayoutEffect(() => {
    if (!active || !current) return;
    const ids = Array.from(new Set([...current.spotlight, current.anchor]));
    function measure() {
      const map: Record<string, Rect> = {};
      for (const id of ids) {
        const r = measureId(id);
        if (r) map[id] = r;
      }
      setRects(map);
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, current]);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        stop();
      } else if (event.key === "ArrowRight") {
        if (step >= STEPS.length - 1) stop();
        else next();
      } else if (event.key === "ArrowLeft") {
        if (step === 0) backToWelcome();
        else prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, step, next, prev, backToWelcome, stop]);

  if (!active || !current) return null;

  const isLast = step >= STEPS.length - 1;
  const spotRects = current.spotlight
    .map((id) => rects[id])
    .filter((r): r is Rect => Boolean(r));
  const anchor = rects[current.anchor];

  let cardTop = window.innerHeight / 2 - 80;
  let cardLeft = window.innerWidth / 2 - CARD_W / 2;
  if (anchor) {
    if (current.placement === "left") {
      cardLeft = Math.max(8, anchor.left - GAP - CARD_W);
      const above = current.aboveOf ? rects[current.aboveOf] : undefined;
      cardTop = above ? Math.max(8, above.top - GAP - cardHeight) : anchor.top;
    } else {
      cardLeft = Math.min(
        Math.max(anchor.left + anchor.width / 2 - CARD_W / 2, 8),
        window.innerWidth - CARD_W - 8,
      );
      cardTop = anchor.top + anchor.height + PAD + GAP;
    }
  }

  const transition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30 };

  return (
    <motion.div
      className="fixed inset-0 z-[60]"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <svg aria-hidden className="text-primary pointer-events-none fixed inset-0 h-full w-full">
        <defs>
          <mask id="lux-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotRects.map((r, index) => (
              <rect
                key={index}
                x={r.left - PAD}
                y={r.top - PAD}
                width={r.width + PAD * 2}
                height={r.height + PAD * 2}
                rx="12"
                fill="black"
              />
            ))}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgb(0 0 0 / 0.55)"
          mask="url(#lux-tour-mask)"
        />
        {spotRects.map((r, index) => (
          <rect
            key={index}
            x={r.left - PAD}
            y={r.top - PAD}
            width={r.width + PAD * 2}
            height={r.height + PAD * 2}
            rx="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        ))}
      </svg>

      <motion.div
        ref={cardRef}
        role="dialog"
        aria-label={current.title}
        className="
          glass-panel fixed w-72 rounded-xl bg-[var(--glass-bg-thick)] p-4 text-popover-foreground
        "
        initial={false}
        animate={{ top: cardTop, left: cardLeft }}
        transition={transition}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-2xs font-medium tracking-wide tabular-nums">
            {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={stop}
            className="text-muted-foreground hover:text-foreground text-xs font-medium"
          >
            Skip
          </button>
        </div>
        <h3 className="mt-1.5 text-sm font-semibold">{current.title}</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{current.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step === 0 ? backToWelcome() : prev())}
          >
            Back
          </Button>
          <Button size="sm" onClick={() => (isLast ? stop() : next())}>
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
