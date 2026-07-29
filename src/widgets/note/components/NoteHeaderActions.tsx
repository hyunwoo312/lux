import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { POP } from "@/lib/motion";
import { WIDGET_HEADER_ACTION } from "@/widgets/core/BaseWidget";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { getNoteData, useNote } from "@/widgets/note/useNoteStore";

const COPIED_MS = 1600;
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
  const instanceId = useWidgetInstanceId();
  const hasText = useNote(instanceId).text.trim().length > 0;
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  if (!hasText) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getNoteData(instanceId).text);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  }

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
          size="icon"
          className={WIDGET_HEADER_ACTION}
          aria-label="Copy note"
          onClick={() => void handleCopy()}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {copied ? (
              <motion.span key="copied" {...POP} className="text-primary flex">
                <Check />
              </motion.span>
            ) : (
              <motion.span key="copy" {...POP} className="flex">
                <Copy />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </Tooltip>
      <Tooltip content="Download as .txt" sticky>
        <Button
          variant="ghost"
          size="icon"
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
