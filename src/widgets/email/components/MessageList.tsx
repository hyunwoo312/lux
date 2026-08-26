import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertCircle, MailOpen } from "lucide-react";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useNow } from "@/hooks/useNow";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ListGroupHeading } from "@/components/ListGroupHeading";
import { StateMessage } from "@/components/StateMessage";
import { MessageRow } from "@/widgets/email/components/MessageRow";
import { groupMessages } from "@/widgets/email/lib/groups";
import { MAIL_PROVIDER_LABELS, type MailMessage, type MailProvider } from "@/widgets/email/types";

type MessageListProps = {
  messages: MailMessage[];
  newTab: boolean;
  filtered: boolean;
  showProvider: boolean;
  failures: Partial<Record<MailProvider, string>>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
};

export function MessageList({
  messages,
  newTab,
  filtered,
  showProvider,
  failures,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: MessageListProps) {
  const reduced = useReducedMotion();
  const now = useNow().getTime();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLButtonElement>(null);
  useInfiniteScroll(scrollRef, sentinelRef, hasMore, onLoadMore ?? (() => {}));

  const broken = Object.entries(failures) as [MailProvider, string][];

  if (messages.length === 0 && broken.length > 0) {
    return (
      <StateMessage
        icon={AlertCircle}
        tone="error"
        compact
        title={`${MAIL_PROVIDER_LABELS[broken[0]![0]]} couldn’t be reached`}
        message={broken[0]![1]}
      />
    );
  }

  if (messages.length === 0) {
    return (
      <StateMessage
        icon={MailOpen}
        compact
        message={filtered ? "No messages match that." : "Inbox zero — nothing waiting."}
      />
    );
  }

  const rows: ReactNode[] = [];
  groupMessages(messages, now).forEach((group, index) => {
    rows.push(
      <motion.li
        key={`group:${group.label}`}
        layout={!reduced}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
      >
        <ListGroupHeading label={group.label} className={index === 0 ? "pt-0.5" : undefined} />
      </motion.li>,
    );
    for (const message of group.messages) {
      rows.push(
        <motion.li
          key={message.id}
          layout={!reduced}
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE_OUT }}
        >
          <MessageRow message={message} newTab={newTab} showProvider={showProvider} now={now} />
        </motion.li>,
      );
    }
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AnimatePresence initial={false}>
        {broken.length > 0 && (
          <motion.div
            key="failures"
            className="shrink-0 overflow-hidden"
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT }}
          >
            {broken.map(([provider, reason]) => (
              <p
                key={provider}
                className="text-warning flex items-start gap-1.5 px-2 pb-1 text-micro"
              >
                <AlertCircle className="mt-0.5 size-3 shrink-0" aria-hidden />
                <span>
                  {MAIL_PROVIDER_LABELS[provider]}: {reason}
                </span>
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={scrollRef} className="scroll-fade min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <ul aria-label="Inbox" className="flex flex-col gap-0.5 px-0.5 pb-1">
          <AnimatePresence initial={false} mode="popLayout">
            {rows}
          </AnimatePresence>
        </ul>
        {hasMore && (
          <div className="px-0.5 pb-1">
            <Button
              ref={sentinelRef}
              variant="ghost"
              size="xs"
              className="text-ink-3 hover:text-ink-2 w-full"
              disabled={isLoadingMore}
              onClick={onLoadMore}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={isLoadingMore ? "loading" : "idle"}
                  className="flex items-center gap-1.5"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : DURATION.fast, ease: EASE_OUT }}
                >
                  {isLoadingMore ? (
                    <>
                      <Spinner className="size-3" />
                      Loading more…
                    </>
                  ) : (
                    "Load older mail"
                  )}
                </motion.span>
              </AnimatePresence>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
