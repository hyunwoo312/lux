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
} from "lucide-react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { IconRow } from "@/components/IconRow";
import { ChromeMark, GithubMark, KofiMark } from "@/components/icons/service-icons";
import { CWS_URL, KOFI_URL, PRIVACY_URL, REPO_URL, SITE_URL } from "@/lib/links";
import {
  EASE_BACK,
  EASE_OUT,
  EASE_STANDARD,
  listVariants,
  revealVariants,
  springPop,
  tap,
} from "@/lib/motion";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { useGithubStars } from "@/settings/useGithubStars";
import { useSettingsStore } from "@/settings/useSettingsStore";

const DESCRIPTION =
  "A customizable new tab dashboard — widgets and quick access to the sites you visit most.";

const AUTHOR_URL = "https://hyunwk.me/";

function readVersion(): string | null {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return null;
  }
}

function formatStars(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

export function AboutTab() {
  const reduced = useReducedMotion();
  const container = listVariants(reduced, "loose");
  const item = revealVariants(reduced);
  const setTab = useSettingsStore((s) => s.setTab);
  const version = readVersion();
  const stars = useGithubStars();

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
          rounded-xl border bg-gradient-to-br to-transparent px-6 py-8 text-center
        "
      >
        <LogoMark />

        <div className="flex flex-col items-center gap-1">
          <h2 className="text-heading font-semibold tracking-tight">Lux</h2>
          <p className="text-ink-3 text-body">A new tab worth opening.</p>
        </div>

        <p className="text-ink-4 max-w-xs text-caption text-balance">{DESCRIPTION}</p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-ink-3
              hover:text-ink
              inline-flex items-center gap-1.5 text-caption transition-colors
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
          {version && (
            <a
              href={`${REPO_URL}/releases`}
              target="_blank"
              rel="noopener noreferrer"
              className="
                border-border/60 bg-card/60 text-ink-3
                hover:text-ink
                rounded-full border px-2 py-0.5 text-micro font-medium tabular-nums
                transition-colors
              "
            >
              v{version}
            </a>
          )}
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-ink
              hover:bg-accent
              inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-caption font-medium
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
              text-ink
              hover:bg-accent
              inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-caption font-medium
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
              text-ink
              hover:bg-accent
              inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-caption font-medium
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
          action={
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-primary inline-flex items-center gap-1 text-caption font-medium
                hover:underline
              "
            >
              Privacy policy
              <ExternalLink className="size-3" />
            </a>
          }
        >
          <IconRow icon={HardDrive} title="Local-only">
            Your dashboard, widgets, and settings live in this browser — never on a server.
          </IconRow>
          <IconRow icon={EyeOff} title="No tracking">
            No account, no analytics, no telemetry. Ever.
          </IconRow>
          <IconRow icon={Network} title="Token relay">
            Connecting Microsoft or GitHub routes sign-in and token refresh through a tiny stateless
            Lux relay that stores nothing. Google signs in through Chrome, and everything else stays
            on your device.
          </IconRow>
          <IconRow
            icon={KeyRound}
            title="Minimal permissions"
            action={
              <button
                type="button"
                onClick={() => setTab("accounts")}
                className="
                  press cursor-pointer text-primary w-fit text-caption font-medium
                  hover:underline
                "
              >
                Manage in Accounts &amp; Permissions
              </button>
            }
          >
            Lux requests only what a feature needs, when it needs it.
          </IconRow>
          <IconRow icon={Code2} title="Open source">
            Every line is public on GitHub — inspect it, fork it, or send a fix.
          </IconRow>
          <IconRow
            icon={Download}
            title="Your data, your call"
            action={
              <button
                type="button"
                onClick={() => setTab("storage")}
                className="
                  press cursor-pointer text-primary w-fit text-caption font-medium
                  hover:underline
                "
              >
                Back up or reset in Storage
              </button>
            }
          >
            Back up your whole setup to a file, restore it anywhere, or reset it all.
          </IconRow>
        </SettingsSection>
      </motion.div>

      <motion.p variants={item} className="text-ink-4 text-center text-caption">
        Made by{" "}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink underline transition-colors"
        >
          Hyun
        </a>
        {" · Report an "}
        <a
          href={`${REPO_URL}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink underline transition-colors"
        >
          issue
        </a>
        {" · Support on "}
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink underline transition-colors"
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

const CELEBRATE_SECONDS = 0.7;
const SHEEN_SECONDS = 1.8;
const SHEEN_GAP_SECONDS = 3.5;

function LogoMark() {
  const reduced = useReducedMotion();
  const lift = tap(reduced, "surface");
  const spin = useAnimationControls();
  const glow = useAnimationControls();

  if (reduced) {
    return <img src="/logo.svg" alt="" className="size-16 object-contain" />;
  }

  function celebrate() {
    void spin.start({
      rotate: [0, 360],
      scale: [1, 0.82, 1.12, 1],
      transition: { duration: CELEBRATE_SECONDS, ease: EASE_BACK },
    });
    void glow.start({
      opacity: [0.5, 0],
      scale: [0.5, 1.9],
      transition: { duration: CELEBRATE_SECONDS, ease: EASE_OUT },
    });
  }

  return (
    <motion.button
      type="button"
      aria-label="Lux"
      onClick={celebrate}
      whileHover={{ y: -5 }}
      whileTap={lift.whileTap}
      transition={springPop(reduced)}
      className="focus-ring relative grid size-16 cursor-pointer place-items-center rounded-xl"
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
            transition={{
              duration: SHEEN_SECONDS,
              repeat: Infinity,
              repeatDelay: SHEEN_GAP_SECONDS,
              ease: EASE_STANDARD,
            }}
          />
        </span>
      </motion.span>
    </motion.button>
  );
}
