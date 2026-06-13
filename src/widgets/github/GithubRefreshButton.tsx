import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useGithubStore } from "@/widgets/github/useGithubStore";

export function GithubRefreshButton() {
  const reduced = useReducedMotion();
  const syncing = useGithubStore((s) => s.syncing);
  const requestSync = useGithubStore((s) => s.requestSync);
  const spinning = syncing && !reduced;

  return (
    <Tooltip content="Refresh" sticky>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground/60 hover:text-foreground size-7 rounded-sm [&_svg]:size-4"
        aria-label="Refresh"
        disabled={syncing}
        onClick={() => requestSync(true)}
      >
        <motion.span
          className="inline-flex"
          animate={{ rotate: spinning ? 360 : 0 }}
          transition={
            spinning ? { repeat: Infinity, ease: "linear", duration: 0.8 } : { duration: 0.2 }
          }
        >
          <RefreshCw />
        </motion.span>
      </Button>
    </Tooltip>
  );
}
