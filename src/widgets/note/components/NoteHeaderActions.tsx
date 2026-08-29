import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { pop } from "@/lib/motion";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/chromeStyles";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { getNoteData, useNote } from "@/widgets/note/useNoteStore";

const FILE_NAME_WORDS = 6;
const FILE_NAME_MAX = 40;

function downloadName(text: string): string {
  const slug = text
    .trim()
    .split(/\s+/)
    .slice(0, FILE_NAME_WORDS)
    .join("-")
    .replace(/[^\w-]/g, "")
    .slice(0, FILE_NAME_MAX)
    .toLowerCase();
  return `${slug || "note"}.txt`;
}

export function NoteHeaderActions() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const hasText = useNote(instanceId).text.trim().length > 0;
  const { status, copy } = useCopyToClipboard();
  const copied = status === "copied";

  if (!hasText) return null;

  function handleDownload() {
    const { text } = getNoteData(instanceId);
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName(text);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip content={copied ? "Copied" : "Copy note"} sticky>
        <Button
          variant="ghost"
          size="icon-xs"
          className={WIDGET_HEADER_ACTION}
          aria-label="Copy note"
          onClick={() => copy(getNoteData(instanceId).text)}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {copied ? (
              <motion.span key="copied" {...pop(reduced)} className="text-primary flex">
                <Check />
              </motion.span>
            ) : (
              <motion.span key="copy" {...pop(reduced)} className="flex">
                <Copy />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </Tooltip>
      <Tooltip content="Download as .txt" sticky>
        <Button
          variant="ghost"
          size="icon-xs"
          className={WIDGET_HEADER_ACTION}
          aria-label="Download note as a text file"
          onClick={handleDownload}
        >
          <Download />
        </Button>
      </Tooltip>
    </div>
  );
}
