import type { ReactNode } from "react";
import { Compass, MousePointerClick, Plug, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconRow } from "@/components/IconRow";
import { formatShortcut, type Shortcut } from "@/lib/shortcuts";
import { useOnboardingStore } from "@/onboarding";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { useSettingsStore } from "@/settings/useSettingsStore";
import { useShortcutsStore } from "@/stores/useShortcutsStore";

const REPO_URL = "https://github.com/hyunwoo312/lux";
const SHORTCUT_PREVIEW = 3;

export function HelpTab() {
  const setTab = useSettingsStore((s) => s.setTab);
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const startTour = useOnboardingStore((s) => s.startTour);
  const openSettings = useShortcutsStore((s) => s.openSettings);
  const toggleTheme = useShortcutsStore((s) => s.toggleTheme);

  function takeTour() {
    closeSettings();
    startTour();
  }

  const shortcuts = [
    { label: "Open settings", list: openSettings },
    { label: "Toggle light / dark", list: toggleTheme },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Getting started" description="Everything here works with a click.">
        <HelpItem icon={MousePointerClick} title="Use the toolbar">
          The controls in the top-right corner let you switch light/dark, add a widget with{" "}
          <Key>+</Key>, edit your layout with the pencil, and open settings with the gear.
        </HelpItem>
        <HelpItem icon={Plug} title="Connect your accounts">
          Calendar, Spotify, and Tasks need a one-time sign-in.{" "}
          <LinkButton onClick={() => setTab("accounts")}>
            Open Accounts &amp; Permissions
          </LinkButton>
        </HelpItem>
        <Button variant="outline" size="sm" className="w-fit gap-2" onClick={takeTour}>
          <Compass className="size-4" />
          Take the guided tour
        </Button>
      </SettingsSection>

      <SettingsSection
        title="Keyboard shortcuts"
        description="Prefer the keyboard? These speed things up."
      >
        {shortcuts.slice(0, SHORTCUT_PREVIEW).map((shortcut) => (
          <ShortcutRow key={shortcut.label} label={shortcut.label} list={shortcut.list} />
        ))}
        <span aria-hidden className="text-foreground -my-1 text-sm leading-none tracking-widest">
          …
        </span>
        <LinkButton onClick={() => setTab("shortcuts")}>
          See and edit all keyboard shortcuts
        </LinkButton>
      </SettingsSection>

      <SettingsSection title="Frequently Asked Questions">
        <Faq question='A "Customize Chrome / Brave" bar shows at the bottom of the new tab'>
          That bar belongs to your browser, not Lux — Chrome and Brave 138+ add it to every
          extension&apos;s new tab page. To remove it, right-click the bar and choose{" "}
          <em>Hide footer on New Tab page</em>.
        </Faq>
        <Faq question="Where is my data stored?">
          Your dashboard, widgets, and settings never leave this browser — no account, no analytics,
          no telemetry. <LinkButton onClick={() => setTab("about")}>More on privacy</LinkButton>
        </Faq>
        <Faq question="How do I back up or move my setup?">
          Export everything to a file and import it on another machine from{" "}
          <LinkButton onClick={() => setTab("general")}>General</LinkButton>.
        </Faq>
      </SettingsSection>

      <SettingsSection title="More help">
        <p className="text-muted-foreground text-sm">
          Browse the source or report an issue on{" "}
          <a
            href={`${REPO_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            <GithubMark className="mr-1 inline-block size-3.5 align-[-0.125em]" />
            GitHub
          </a>
          .
        </p>
      </SettingsSection>
    </div>
  );
}

function HelpItem({
  icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <IconRow icon={icon} title={title}>
      {children}
    </IconRow>
  );
}

function ShortcutRow({ label, list }: { label: string; list: Shortcut[] }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <Keys list={list} />
    </div>
  );
}

function Keys({ list }: { list: Shortcut[] }) {
  if (list.length === 0) return <span className="text-muted-foreground text-xs">Unset</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {list.map((shortcut) => (
        <Key key={formatShortcut(shortcut)}>{formatShortcut(shortcut)}</Key>
      ))}
    </span>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="
      border-border/60 bg-card text-foreground rounded border px-1.5 py-0.5 text-xs font-medium
    ">
      {children}
    </kbd>
  );
}

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-foreground text-sm font-medium">{question}</span>
      <p className="text-muted-foreground pl-3 text-xs leading-relaxed">{children}</p>
    </div>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-primary w-fit text-xs font-medium hover:underline"
    >
      {children}
    </button>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
