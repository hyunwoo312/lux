import type { CSSProperties } from "react";
import { GmailServiceIcon, OutlookServiceIcon } from "@/components/icons/service-icons";
import { cn } from "@/lib/utils";
import type { MailProvider } from "@/widgets/email/types";

const PROVIDER_ICON = {
  google: GmailServiceIcon,
  microsoft: OutlookServiceIcon,
} as const;

const HUES = 360;

function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(" ")
    .filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}

function hueOf(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (Math.imul(hash, 31) + name.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % HUES;
}

type SenderAvatarProps = {
  from: string;
  provider: MailProvider;
  showProvider: boolean;
  unread: boolean;
};

export function SenderAvatar({ from, provider, showProvider, unread }: SenderAvatarProps) {
  const Badge = PROVIDER_ICON[provider];
  const tint = { "--sender-hue": hueOf(from) } as CSSProperties;

  return (
    <span className="relative shrink-0">
      <span
        aria-hidden
        style={tint}
        className={cn(
          "sender-tint grid size-9 place-items-center rounded-full text-caption font-semibold",
          "tracking-tight transition-opacity",
          unread ? "opacity-100" : "opacity-65",
        )}
      >
        {initials(from)}
      </span>
      {showProvider && (
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 grid place-items-center [&_img]:size-4"
        >
          <Badge />
        </span>
      )}
    </span>
  );
}
