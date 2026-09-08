import type { ChangeEvent } from "react";
import { useRef } from "react";
import { Upload } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/asset-store";
import { DashedAction } from "@/components/DashedAction";

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
    <>
      <DashedAction
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="bg-background/30 px-3 py-2.5 text-left"
      >
        <span
          className="
            bg-foreground/5 flex size-8 shrink-0 items-center justify-center rounded-md
            [&_svg]:size-4
          "
        >
          <Upload aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="text-ink text-body font-medium">{title}</strong>
          <span className="text-ink-3 truncate text-caption">{description}</span>
        </span>
      </DashedAction>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="hidden"
      />
    </>
  );
}
