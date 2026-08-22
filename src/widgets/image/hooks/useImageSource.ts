import { useEffect, useRef, useState } from "react";
import { readImageAsset } from "@/widgets/image/media";
import { useImageStore } from "@/widgets/image/useImageStore";

export type ImageSource = {
  thumbUrl: string | null;
  fullUrl: string | null;
  loadError: string | null;
};

const REVOKE_DELAY_MS = 600;

export function useImageSource(assetId: string | null): ImageSource {
  const [source, setSource] = useState<ImageSource>({
    thumbUrl: null,
    fullUrl: null,
    loadError: null,
  });
  const liveUrls = useRef<string[]>([]);

  useEffect(() => {
    const release = (urls: string[], delayMs: number) => {
      if (urls.length === 0) return;
      window.setTimeout(() => urls.forEach((url) => URL.revokeObjectURL(url)), delayMs);
    };

    if (!assetId) {
      release(liveUrls.current, 0);
      liveUrls.current = [];
      setSource({ thumbUrl: null, fullUrl: null, loadError: null });
      return;
    }

    let active = true;
    void (async () => {
      try {
        const asset = await readImageAsset(assetId);
        if (!active) return;
        if (!asset) {
          setSource({
            thumbUrl: null,
            fullUrl: null,
            loadError: "Image file is no longer available. Replace it to continue.",
          });
          void useImageStore
            .getState()
            .sanitizeAssets()
            .catch(() => undefined);
          return;
        }
        const fullUrl = URL.createObjectURL(asset.blob);
        const thumbUrl = asset.thumb ? URL.createObjectURL(asset.thumb) : null;
        const previous = liveUrls.current;
        liveUrls.current = thumbUrl ? [fullUrl, thumbUrl] : [fullUrl];
        setSource({ thumbUrl, fullUrl, loadError: null });
        release(previous, REVOKE_DELAY_MS);
      } catch (error) {
        if (!active) return;
        setSource({
          thumbUrl: null,
          fullUrl: null,
          loadError: error instanceof Error ? error.message : "Image could not be loaded.",
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [assetId]);

  useEffect(
    () => () => {
      liveUrls.current.forEach((url) => URL.revokeObjectURL(url));
      liveUrls.current = [];
    },
    [],
  );

  return source;
}
