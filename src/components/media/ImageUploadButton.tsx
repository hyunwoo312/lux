import type { ChangeEvent } from "react";
import { useRef } from "react";
import { Upload } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/asset-store";

type ImageUploadButtonProps = {
  title: string;
  description: string;
  multiple: boolean;
  disabled: boolean;
  onFiles: (files: File[]) => void;
};

export function ImageUploadButton({
  title,
  description,
  multiple,
  disabled,
  onFiles,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    onFiles(files);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      className="
        border-border/60 bg-background/30
        hover:border-foreground/40 hover:text-foreground
        text-muted-foreground relative flex w-full items-center gap-3 rounded-lg border
        border-dashed px-3 py-2.5 text-left transition-colors outline-none
        disabled:cursor-default disabled:opacity-60
      "
    >
      <span className="
        bg-foreground/5 flex size-8 shrink-0 items-center justify-center rounded-md
        [&_svg]:size-4
      ">
        <Upload aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-foreground text-sm font-medium">{title}</strong>
        <span className="text-muted-foreground truncate text-xs">{description}</span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="pointer-events-none absolute size-px opacity-0"
      />
    </button>
  );
}
