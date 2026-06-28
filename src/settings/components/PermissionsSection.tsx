import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef } from "react";
import {
  Bookmark,
  Clock,
  HardDrive,
  History,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useGrantedPermissions } from "@/hooks/usePermission";
import { isPermissionsManageable, setPermissionGranted } from "@/lib/permissions";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { useSettingsStore } from "@/settings/useSettingsStore";

type PermissionItem = {
  id: chrome.runtime.ManifestPermission;
  name: string;
  description: string;
  usedBy: string;
  icon: ComponentType<{ className?: string }>;
  required: boolean;
};

const PERMISSIONS: PermissionItem[] = [
  {
    id: "bookmarks",
    name: "Bookmarks",
    description: "Browse and search your bookmarks in Quick Access.",
    usedBy: "Quick Access",
    icon: Bookmark,
    required: false,
  },
  {
    id: "history",
    name: "Browsing history",
    description: "Suggests recently visited sites in Quick Access.",
    usedBy: "Quick Access",
    icon: History,
    required: false,
  },
  {
    id: "sessions",
    name: "Recently closed tabs",
    description: "Lists recently closed tabs in Quick Access.",
    usedBy: "Quick Access",
    icon: Clock,
    required: false,
  },
  {
    id: "topSites",
    name: "Top sites",
    description: "Shows your most-visited sites in Quick Access.",
    usedBy: "Quick Access",
    icon: LayoutGrid,
    required: false,
  },
  {
    id: "storage",
    name: "Local storage",
    description: "Saves your dashboard, widgets, and settings on this device.",
    usedBy: "Everywhere",
    icon: HardDrive,
    required: true,
  },
  {
    id: "identity",
    name: "Account sign-in",
    description: "Connects Google, Outlook, Spotify, and GitHub with OAuth.",
    usedBy: "Accounts",
    icon: KeyRound,
    required: true,
  },
  {
    id: "favicon",
    name: "Site icons",
    description: "Shows favicons for links and search results.",
    usedBy: "Links & search",
    icon: ImageIcon,
    required: true,
  },
];

export function PermissionsSection() {
  const available = isPermissionsManageable();
  const granted = useGrantedPermissions();
  const highlight = useSettingsStore((s) => s.permissionHighlight);
  const clearHighlight = useSettingsStore((s) => s.clearPermissionHighlight);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const optional = PERMISSIONS.filter((permission) => !permission.required);
  const required = PERMISSIONS.filter((permission) => permission.required);

  useEffect(() => {
    if (!highlight) return;
    rowRefs.current.get(highlight)?.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = window.setTimeout(() => clearHighlight(), 2200);
    return () => window.clearTimeout(timer);
  }, [highlight, clearHighlight]);

  const registerRow = (id: string) => (el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };

  return (
    <SettingsSection
      title="Permissions"
      description="Optional permissions power extra features and can be turned off anytime. Required ones keep the dashboard working."
    >
      {!available && (
        <p className="text-muted-foreground text-xs">
          Permission controls are available once Lux is installed as an extension.
        </p>
      )}

      <SubLabel>Optional</SubLabel>
      {optional.map((permission) => (
        <PermissionRow
          key={permission.id}
          rowRef={registerRow(permission.id)}
          permission={permission}
          highlighted={highlight === permission.id}
          checked={granted.has(permission.id)}
          disabled={!available}
          onToggle={(enabled) => void setPermissionGranted(permission.id, enabled)}
        />
      ))}

      <SubLabel>Required</SubLabel>
      {required.map((permission) => (
        <PermissionRow
          key={permission.id}
          rowRef={registerRow(permission.id)}
          permission={permission}
          highlighted={highlight === permission.id}
          required
        />
      ))}
    </SettingsSection>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <span className="
      text-muted-foreground/70 text-2xs mt-2 px-0.5 font-semibold tracking-wider uppercase
      first:mt-0
    ">
      {children}
    </span>
  );
}

function PermissionRow({
  rowRef,
  permission,
  highlighted,
  checked = false,
  disabled = false,
  required = false,
  onToggle,
}: {
  rowRef?: (el: HTMLDivElement | null) => void;
  permission: PermissionItem;
  highlighted: boolean;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  onToggle?: (enabled: boolean) => void;
}) {
  const Icon = permission.icon;
  return (
    <div
      ref={rowRef}
      className={cn(
        "-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors",
        highlighted && "bg-primary/10 ring-primary/40 ring-2",
      )}
    >
      <Icon className="text-muted-foreground size-6 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{permission.name}</span>
          <span className="
            bg-muted/70 text-muted-foreground/80 rounded px-1 py-px text-[0.6rem] font-medium
          ">
            {permission.usedBy}
          </span>
        </span>
        <span className="text-muted-foreground text-xs">{permission.description}</span>
      </div>
      {required ? (
        <span className="
          border-border/60 text-muted-foreground/80 text-2xs shrink-0 rounded-full border px-2
          py-0.5 font-medium
        ">
          Required
        </span>
      ) : (
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onToggle?.(value === true)}
          aria-label={`Allow ${permission.name.toLowerCase()}`}
        />
      )}
    </div>
  );
}
