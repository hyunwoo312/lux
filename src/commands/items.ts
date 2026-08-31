import type { CommandResult, CommandSetup, WidgetIcon } from "@/widgets/core/types";

export const COMMAND_SECTIONS = ["commands", "links", "search"] as const;

export type CommandSection = (typeof COMMAND_SECTIONS)[number];

export const SYSTEM_OWNER = "System";

export const COMMAND_SECTION_LABELS: Record<CommandSection, string> = {
  commands: "Commands",
  links: "Browser",
  search: "Search",
};

type CommandItemBase = {
  id: string;
  section: CommandSection;
  label: string;
  detail?: string;
  meta?: string;
  setup?: CommandSetup | null;
  icon: WidgetIcon;
  artworkUrl?: string;
  keywords?: readonly string[];
};

export type CommandItem = CommandItemBase &
  (
    | { effect: "run"; run: () => void | Promise<void> }
    | {
        effect: "scope";
        placeholder: string;
        emptyMessage?: (query: string) => string;
        search: (query: string, signal: AbortSignal) => Promise<CommandResult[]>;
      }
  );
