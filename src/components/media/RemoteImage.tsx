import type { ComponentProps } from "react";

export function RemoteImage(props: ComponentProps<"img">) {
  return <img referrerPolicy="no-referrer" loading="lazy" decoding="async" {...props} />;
}
