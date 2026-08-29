import { useCallback } from "react";
import { useMediaUploads } from "@/hooks/useMediaUploads";
import { deleteImageAsset, saveImageAsset, validateImageFile } from "@/widgets/image/media";
import { MAX_MULTI_IMAGES, type ImageItem } from "@/widgets/image/types";
import { useImage, useImageStore } from "@/widgets/image/useImageStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function useImageUploads() {
  const instanceId = useWidgetInstanceId();
  const mode = useImage((c) => c.mode);
  const single = useImage((c) => c.single);
  const items = useImage((c) => c.items);
  const setSingle = useImageStore((s) => s.setSingle);
  const setItems = useImageStore((s) => s.setItems);

  const applySingle = useCallback(
    (item: ImageItem | null) => setSingle(instanceId, item),
    [setSingle, instanceId],
  );
  const applyItems = useCallback(
    (next: ImageItem[]) => setItems(instanceId, next),
    [setItems, instanceId],
  );

  return useMediaUploads<ImageItem>({
    mode,
    single,
    items,
    maxItems: MAX_MULTI_IMAGES,
    poolLabel: "Image pool",
    validate: validateImageFile,
    save: saveImageAsset,
    remove: deleteImageAsset,
    setSingle: applySingle,
    setItems: applyItems,
  });
}
