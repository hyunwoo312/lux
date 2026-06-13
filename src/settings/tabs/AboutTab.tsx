import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Code2,
  Download,
  ExternalLink,
  EyeOff,
  Globe,
  HardDrive,
  KeyRound,
  Network,
  Star,
  type LucideIcon,
} from "lucide-react";
import { motion, useAnimationControls, useReducedMotion, type Variants } from "motion/react";
import { z } from "zod";
import { IconRow } from "@/components/IconRow";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { useSettingsStore } from "@/settings/useSettingsStore";

const DESCRIPTION =
  "A customizable new tab dashboard — widgets and quick access to the sites you visit most.";

const REPO_URL = "https://github.com/hyunwoo312/lux";
const GITHUB_API = "https://api.github.com/repos/hyunwoo312/lux";
const AUTHOR_URL = "https://hyunwk.me/";
const SITE_URL = "https://lux.hyunwk.me";
const PRIVACY_URL = `${SITE_URL}/privacy`;
const CWS_URL = "https://chromewebstore.google.com/";
const KOFI_URL = "https://ko-fi.com/hyunwk";

const repoSchema = z.object({ stargazers_count: z.number() });

function readVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "1.0.0";
  }
}

function formatStars(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

export function AboutTab() {
  const reduced = useReducedMotion();
  const setTab = useSettingsStore((s) => s.setTab);
  const version = readVersion();
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(GITHUB_API, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<unknown>) : null))
      .then((data) => {
        const parsed = repoSchema.safeParse(data);
        if (parsed.success) setStars(parsed.data.stargazers_count);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <motion.div
      variants={container}
      initial={reduced ? false : "hidden"}
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div
        variants={item}
        className="
          border-border/60 from-primary/10 relative flex flex-col items-center gap-3 overflow-hidden
          rounded-2xl border bg-gradient-to-br to-transparent px-6 py-8 text-center
        "
      >
        <LogoMark />

        <div className="flex flex-col items-center gap-1">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Lux</h2>
          <p className="text-muted-foreground text-sm">A new tab worth opening.</p>
        </div>

        <p className="text-muted-foreground/70 max-w-xs text-xs text-balance">{DESCRIPTION}</p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-muted-foreground
              hover:text-foreground
              inline-flex items-center gap-1.5 text-xs transition-colors
            "
          >
            <GithubMark className="size-4" />
            {stars === null ? (
              <span>GitHub</span>
            ) : (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="size-3 fill-current" />
                {formatStars(stars)}
              </span>
            )}
          </a>
          <a
            href={`${REPO_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="
              border-border/60 bg-card/60 text-muted-foreground
              hover:text-foreground
              rounded-full border px-2 py-0.5 text-2xs font-medium tabular-nums transition-colors
            "
          >
            v{version}
          </a>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-foreground
              hover:bg-accent
              inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium
              transition-colors
            "
          >
            <Globe className="size-4" />
            Website
          </a>
          <a
            href={CWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-foreground
              hover:bg-accent
              inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium
              transition-colors
            "
          >
            <ChromeMark className="size-4" />
            Chrome Web Store
          </a>
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-foreground
              hover:bg-accent
              inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium
              transition-colors
            "
          >
            <KofiMark className="size-4" />
            Ko-fi
          </a>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <SettingsSection
          title="Privacy"
          description="Everything runs on your device — and the code is yours to check."
          action={
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-primary inline-flex items-center gap-1 text-xs font-medium
                hover:underline
              "
            >
              Privacy policy
              <ExternalLink className="size-3" />
            </a>
          }
        >
          <TrustRow
            icon={HardDrive}
            title="Local-only"
            description="Your dashboard, widgets, and settings live in this browser — never on a server."
          />
          <TrustRow
            icon={EyeOff}
            title="No tracking"
            description="No account, no analytics, no telemetry. Ever."
          />
          <TrustRow
            icon={Network}
            title="Sign-in relay"
            description="Connecting accounts like GitHub briefly routes sign-in through a tiny Lux relay that stores nothing — everything else stays on your device."
          />
          <TrustRow
            icon={KeyRound}
            title="Minimal permissions"
            description="Lux requests only what a feature needs, when it needs it."
            action={
              <button
                type="button"
                onClick={() => setTab("accounts")}
                className="text-primary w-fit text-xs font-medium hover:underline"
              >
                Manage in Accounts &amp; Permissions
              </button>
            }
          />
          <TrustRow
            icon={Code2}
            title="Open source"
            description="Every line is public on GitHub — inspect it, fork it, or send a fix."
          />
          <TrustRow
            icon={Download}
            title="Your data, your call"
            description="Back up your whole setup to a file, restore it anywhere, or reset it all."
            action={
              <button
                type="button"
                onClick={() => setTab("general")}
                className="text-primary w-fit text-xs font-medium hover:underline"
              >
                Back up or reset in General
              </button>
            }
          />
        </SettingsSection>
      </motion.div>

      <motion.p variants={item} className="text-muted-foreground/70 text-center text-xs">
        Made by{" "}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground underline transition-colors"
        >
          Hyun
        </a>
        {" · Report an "}
        <a
          href={`${REPO_URL}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground underline transition-colors"
        >
          issue
        </a>
        {" · Support on "}
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground underline transition-colors"
        >
          Ko-fi
        </a>
      </motion.p>
    </motion.div>
  );
}

const LOGO_MASK = {
  maskImage: "url(/logo.svg)",
  WebkitMaskImage: "url(/logo.svg)",
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
} as const;

function LogoMark() {
  const reduced = useReducedMotion();
  const spin = useAnimationControls();
  const glow = useAnimationControls();

  if (reduced) {
    return <img src="/logo.svg" alt="" className="size-16 object-contain" />;
  }

  function celebrate() {
    void spin.start({
      rotate: [0, 360],
      scale: [1, 0.82, 1.12, 1],
      transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] },
    });
    void glow.start({
      opacity: [0.5, 0],
      scale: [0.5, 1.9],
      transition: { duration: 0.7, ease: "easeOut" },
    });
  }

  return (
    <motion.button
      type="button"
      aria-label="Lux"
      onClick={celebrate}
      whileHover={{ y: -5, scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 380, damping: 16 }}
      className="
        focus-visible:ring-primary/50
        relative grid size-16 place-items-center rounded-2xl outline-none
        focus-visible:ring-2
      "
    >
      <motion.span
        aria-hidden
        className="bg-primary/40 pointer-events-none absolute inset-0 rounded-full blur-md"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={glow}
      />
      <motion.span animate={spin} className="relative grid size-full place-items-center">
        <img src="/logo.svg" alt="" className="size-full object-contain" />
        <span aria-hidden className="pointer-events-none absolute inset-0" style={LOGO_MASK}>
          <motion.span
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)",
            }}
            initial={{ x: "-130%" }}
            animate={{ x: "130%" }}
            transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
          />
        </span>
      </motion.span>
    </motion.button>
  );
}

type TrustRowProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

function TrustRow({ icon, title, description, action }: TrustRowProps) {
  return (
    <IconRow icon={icon} title={title} action={action}>
      {description}
    </IconRow>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function ChromeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z" />
    </svg>
  );
}

function KofiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.716zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.009 3.005-1.087 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
    </svg>
  );
}
