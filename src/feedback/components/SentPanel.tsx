import { motion, useReducedMotion } from "motion/react";
import { Check, Copy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { springPop } from "@/lib/motion";
import { CWS_REVIEW_URL } from "@/lib/links";
import { openUrl } from "@/lib/open-url";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

export function SentPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const reduced = useReducedMotion() ?? false;
  const { status, copy } = useCopyToClipboard();
  const copied = status === "copied";

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <motion.span
        className="bg-primary/10 text-primary grid size-11 place-items-center rounded-full"
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springPop(reduced)}
      >
        <Check className="size-5" aria-hidden />
      </motion.span>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-body font-medium">Thank you — that’s been sent.</p>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => copy(id)}
          aria-label={`Copy reference ${id}`}
          className="text-ink-3 hover:text-ink gap-1.5"
        >
          Reference <span className="font-mono">{id}</span>
          {copied ? (
            <Check className="text-primary size-3" aria-hidden />
          ) : (
            <Copy className="size-3" aria-hidden />
          )}
        </Button>
      </div>
      <p className="text-ink-4 max-w-xs text-caption">
        Every message is read. Keep the reference above if you want to mention it later.
      </p>
      <div className="mt-1 flex items-center gap-2">
        <Button variant="outline" onClick={() => openUrl(CWS_REVIEW_URL, "newTab")}>
          <Star className="size-3.5" aria-hidden />
          Rate Lux
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
