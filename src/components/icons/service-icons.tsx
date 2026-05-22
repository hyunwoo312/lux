import type { ComponentProps } from "react";
import googleCalendarIcon from "@/assets/service-icons/google-calendar.svg";
import outlookIcon from "@/assets/service-icons/outlook.svg";

type ServiceIconProps = Omit<ComponentProps<"img">, "src" | "alt">;

function createServiceIcon(src: string, label: string) {
  function ServiceIcon(props: ServiceIconProps) {
    return <img src={src} alt="" aria-hidden draggable={false} {...props} />;
  }
  ServiceIcon.displayName = `${label}ServiceIcon`;
  return ServiceIcon;
}

export const GoogleCalendarServiceIcon = createServiceIcon(googleCalendarIcon, "GoogleCalendar");
export const OutlookServiceIcon = createServiceIcon(outlookIcon, "Outlook");
