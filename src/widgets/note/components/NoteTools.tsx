import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Code,
  Heading2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Link,
  Type,
  Eye,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { NoteFormat } from "@/widgets/note/lib/format";

const FORMATS = [
  { value: "bold", label: "Bold", shortcut: "Ctrl/⌘ B", icon: Bold },
  { value: "italic", label: "Italic", shortcut: "Ctrl/⌘ I", icon: Italic },
  { value: "code", label: "Inline code", icon: Code },
  { value: "heading", label: "Heading", icon: Heading2 },
  { value: "bullet", label: "Bullet list", icon: List },
  { value: "number", label: "Numbered list", icon: ListOrdered },
  { value: "task", label: "Checklist", icon: ListTodo },
  { value: "quote", label: "Quote", icon: Quote },
  { value: "link", label: "Link", shortcut: "Ctrl/⌘ K", icon: Link },
] as const;

type Props = {
  reading: boolean;
  disabled: boolean;
  onModeChange: (reading: boolean) => void;
  onFormat: (format: NoteFormat) => void;
};

export function NoteTools({ reading, disabled, onModeChange, onFormat }: Props) {
  const [open, setOpen] = useState(false);
  const applying = useRef(false);
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 pb-2">
      <div
        role="group"
        aria-label="Note view"
        className="border-border inline-flex gap-0.5 rounded-md border p-0.5"
      >
        {[
          { read: false, label: "Edit", icon: Pencil },
          { read: true, label: "Read", icon: Eye },
        ].map(({ read, label, icon: Icon }) => (
          <Button
            key={label}
            disabled={disabled}
            size="xs"
            variant="ghost"
            aria-pressed={reading === read}
            onClick={() => onModeChange(read)}
            className={cn(
              "text-ink-3 gap-1.5 border border-transparent",
              reading === read &&
                "border-primary/40 bg-primary/10 text-ink border [&_svg]:text-primary",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </Button>
        ))}
      </div>
      {!reading && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Format note"
              title="Format note"
              disabled={disabled}
              className="text-ink-3 hover:text-ink"
            >
              <Type aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            aria-label="Note formatting"
            align="end"
            className="w-52"
            onCloseAutoFocus={(event) => {
              if (applying.current) event.preventDefault();
              applying.current = false;
            }}
          >
            <p className="text-ink-3 px-2 pt-1 pb-2 text-micro">Format selection or current line</p>
            {FORMATS.map(({ value, label, icon: Icon, ...option }) => (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  applying.current = true;
                  setOpen(false);
                  onFormat(value);
                }}
              >
                <Icon aria-hidden />
                <span className="flex-1 text-left">{label}</span>
                {"shortcut" in option && (
                  <span className="text-ink-3 text-micro">{option.shortcut}</span>
                )}
              </Button>
            ))}
            <p className="text-ink-3 border-border mt-1 border-t px-2 pt-2 pb-1 text-micro">
              Read supports basic Markdown. Other syntax stays as text.
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
