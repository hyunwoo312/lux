import { Music } from "lucide-react";
import { RemoteImage } from "@/components/media/RemoteImage";

export function SpotifyThumb({ url }: { url?: string }) {
  return url ? (
    <RemoteImage src={url} alt="" className="size-9 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="bg-foreground/5 grid size-9 shrink-0 place-items-center rounded-md">
      <Music className="text-ink-3 size-4" aria-hidden />
    </span>
  );
}
