import { useEffect, useRef, useState } from "react";

const BLUR_PX = 20;
const SATURATE = 1.5;
const MAX_EDGE = 900;

export function useBlurredWallpaper(imageUrl: string | null): string | null {
  const [blurredUrl, setBlurredUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const dropCurrent = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setBlurredUrl(null);
    };
    if (!imageUrl) {
      dropCurrent();
      return;
    }
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onerror = () => {
      if (!cancelled) dropCurrent();
    };
    image.onload = () => {
      if (cancelled) return;
      const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.filter = `blur(${BLUR_PX * scale}px) saturate(${SATURATE})`;
      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (cancelled || !blob) return;
        const next = URL.createObjectURL(blob);
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = next;
        setBlurredUrl(next);
      });
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  return blurredUrl;
}
