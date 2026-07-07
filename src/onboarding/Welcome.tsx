import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight, Check, Info, LayoutGrid, Palette, Plug, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconRow } from "@/components/IconRow";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useOnboardingStore } from "@/onboarding/useOnboardingStore";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.5 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT_EXPO } },
};

export function Welcome() {
  const reduced = useReducedMotion();
  const open = useOnboardingStore((s) => s.welcomeOpen);
  const closeWelcome = useOnboardingStore((s) => s.closeWelcome);
  const startTour = useOnboardingStore((s) => s.startTour);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeWelcome()}>
      <DialogContent
        dismissOnClickOutside={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="glass-panel w-[min(28rem,calc(100vw-2rem))] bg-[var(--glass-bg-thick)] p-6"
      >
        <div className="flex flex-col">
          <motion.img
            src="/logo.svg"
            alt=""
            className="mx-auto mb-4 size-12 object-contain"
            initial={reduced ? false : { scale: 0, rotate: -120, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={
              reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 15, delay: 0.1 }
            }
          />

          <motion.div
            variants={container}
            initial={reduced ? false : "hidden"}
            animate="show"
            className="flex flex-col gap-5"
          >
            <motion.div variants={item} className="flex flex-col items-center gap-1.5 text-center">
              <DialogTitle className="font-display text-xl font-semibold tracking-tight">
                Welcome to Lux
              </DialogTitle>
              <DialogDescription className="max-w-xs text-balance">
                Your new tab, your way. Here are 3 things to know.
              </DialogDescription>
            </motion.div>

            <motion.div variants={item} className="flex flex-col gap-3">
              <Row icon={LayoutGrid} title="Make it yours">
                Use the toolbar up top to add widgets and edit your layout.
              </Row>
              <Row icon={Palette} title="Light or dark" control={<ThemeToggle />}>
                Switch the whole look — go ahead, try it now
                <motion.span
                  aria-hidden
                  className="text-primary ml-1 inline-flex align-[-0.15em]"
                  animate={reduced ? undefined : { x: [0, 4, 0] }}
                  transition={
                    reduced ? undefined : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                  }
                >
                  <ArrowRight className="size-3.5" />
                </motion.span>
              </Row>
              <Row icon={Plug} title="Connect your accounts">
                Connect Calendar, Spotify, GitHub, and AniList from Settings.
              </Row>
            </motion.div>

            <motion.div
              variants={item}
              className="
                border-primary/40 bg-primary/10 flex items-start gap-2.5 rounded-lg border px-3
                py-2.5
              "
            >
              <Info className="text-primary mt-0.5 size-4 shrink-0" />
              <p className="text-foreground/90 text-xs leading-relaxed">
                <span className="font-semibold">Heads up:</span> the &quot;Customize Chrome /
                Brave&quot; bar at the bottom of your new tab is your browser&apos;s, not Lux. To
                remove it, right-click the bar and choose{" "}
                <span className="font-medium">Hide footer on New Tab page</span>.
              </p>
            </motion.div>

            <motion.div variants={item} className="flex items-center justify-between gap-2">
              <div className="text-2xs flex items-center gap-1.5">
                <span className="text-primary flex items-center gap-1 font-medium">
                  <Check className="size-3" aria-hidden />
                  Installed
                </span>
                <span aria-hidden className="bg-border h-px w-4" />
                <span className="text-muted-foreground">Tour</span>
                <span aria-hidden className="bg-border h-px w-4" />
                <span className="text-muted-foreground">Customize</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={closeWelcome}>
                  Skip
                </Button>
                <Button onClick={startTour}>Take a tour</Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon,
  title,
  control,
  children,
}: {
  icon: LucideIcon;
  title: string;
  control?: ReactNode;
  children: ReactNode;
}) {
  return (
    <IconRow icon={icon} title={title} control={control}>
      {children}
    </IconRow>
  );
}
