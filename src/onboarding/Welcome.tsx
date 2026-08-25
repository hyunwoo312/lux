import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight, Info, LayoutGrid, Palette, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuideStore } from "@/guide";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconRow } from "@/components/IconRow";
import { DURATION, EASE_OUT_STRONG, EASE_STANDARD, SPRING_SOFT } from "@/lib/motion";
import { TYPE } from "@/lib/type";
import { useOnboardingStore } from "@/onboarding/useOnboardingStore";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE_OUT_STRONG } },
};

export function Welcome() {
  const reduced = useReducedMotion();
  const open = useOnboardingStore((s) => s.welcomeOpen);
  const closeWelcome = useOnboardingStore((s) => s.closeWelcome);
  const openGuide = useGuideStore((s) => s.openGuide);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeWelcome()}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[min(28rem,calc(100vw-2rem))] p-6"
      >
        <div className="flex flex-col">
          <motion.img
            src="/logo.svg"
            alt=""
            className="mx-auto mb-4 size-12 object-contain"
            initial={reduced ? false : { scale: 0, rotate: -120, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={reduced ? { duration: 0 } : SPRING_SOFT}
          />

          <motion.div
            variants={container}
            initial={reduced ? false : "hidden"}
            animate="show"
            className="flex flex-col gap-5"
          >
            <motion.div variants={item} className="flex flex-col items-center gap-1.5 text-center">
              <DialogTitle className={TYPE.heading}>Welcome to Lux</DialogTitle>
              <DialogDescription className="max-w-xs text-balance">
                Your new tab, your way. Here are 3 things to know.
              </DialogDescription>
            </motion.div>

            <motion.div variants={item} className="flex flex-col gap-3">
              <IconRow icon={LayoutGrid} title="Make it yours">
                Use the toolbar up top to add widgets and edit your layout.
              </IconRow>
              <IconRow icon={Palette} title="Light or dark" control={<ThemeToggle />}>
                Switch the whole look — go ahead, try it now
                <motion.span
                  aria-hidden
                  className="text-primary ml-1 inline-flex align-[-0.15em]"
                  animate={reduced ? undefined : { x: [0, 4, 0] }}
                  transition={
                    reduced ? undefined : { duration: 1.1, repeat: 2, ease: EASE_STANDARD }
                  }
                >
                  <ArrowRight className="size-3.5" />
                </motion.span>
              </IconRow>
              <IconRow icon={Plug} title="Connect your accounts">
                Calendar, GitHub and AniList connect in one step from Settings. Spotify needs a few
                more.
              </IconRow>
            </motion.div>

            <motion.div
              variants={item}
              className="
                border-primary/25 bg-primary/8 flex items-start gap-3 rounded-xl border px-3 py-3
              "
            >
              <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
              <p className="text-ink text-caption leading-relaxed">
                <span className="font-semibold">Heads up:</span> the &quot;Customize Chrome /
                Brave&quot; bar at the bottom of your new tab is your browser&apos;s, not Lux. To
                remove it, right-click the bar and choose{" "}
                <span className="font-medium">Hide footer on New Tab page</span>.
              </p>
            </motion.div>

            <motion.div variants={item} className="flex items-center justify-end gap-2">
              <Button size="lg" variant="ghost" onClick={closeWelcome}>
                Skip
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  closeWelcome();
                  openGuide();
                }}
              >
                Open the guide
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
