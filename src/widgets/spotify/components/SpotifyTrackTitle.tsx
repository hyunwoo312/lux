import { Heart } from "lucide-react";
import { SpotifyMarquee } from "@/widgets/spotify/components/SpotifyMarquee";

export function SpotifyTrackTitle({ title, liked }: { title: string; liked: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <SpotifyMarquee label={title} className="min-w-0 flex-1 text-body font-semibold" />
      {liked && (
        <span
          role="img"
          aria-label="Saved to your Spotify library"
          className="text-primary flex shrink-0"
        >
          <Heart className="size-3 fill-current" />
        </span>
      )}
    </div>
  );
}
