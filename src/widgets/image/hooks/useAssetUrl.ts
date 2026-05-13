import { useEffect, useState } from "react";
import { readImageAsset } from "@/widgets/image/media";

export function useAssetUrl(assetId: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null);
    void readImageAsset(assetId)
      .then((asset) => {
        if (!active || !asset) return;
        objectUrl = URL.createObjectURL(asset.blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  return url;
}
