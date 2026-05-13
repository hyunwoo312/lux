import { Image as ImageIcon } from "lucide-react";
import type { WidgetPlugin } from "@/widgets/core/types";
import { ImageBackdrop } from "@/widgets/image/ImageBackdrop";
import { ImageConfig } from "@/widgets/image/ImageConfig";
import { ImageStatus } from "@/widgets/image/ImageStatus";
import { ImageWidget } from "@/widgets/image/ImageWidget";
import { useImageStore } from "@/widgets/image/useImageStore";

export const imagePlugin: WidgetPlugin = {
  type: "image",
  name: "Image",
  icon: ImageIcon,
  defaultLayout: { w: 5, h: 5, minW: 5, minH: 5, maxW: 12, maxH: 12 },
  component: ImageWidget,
  configComponent: ImageConfig,
  statusComponent: ImageStatus,
  backdropComponent: ImageBackdrop,
  accent: "yellow",
  bleed: true,
  useBare: () => useImageStore((s) => s.hideFrame),
};
