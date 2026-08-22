import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef } from "react";
import {
  AppWindow,
  Bookmark,
  Clock,
  Database,
  HardDrive,
  History,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useGrantedPermissions } from "@/hooks/usePermission";
import { isPermissionsManageable, setPermissionsGranted } from "@/lib/permissions";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { useSettingsStore } from "@/settings/useSettingsStore";

type PermissionItem = {
  id: chrome.runtime.ManifestPermission;
  alsoNeeds?: chrome.runtime.ManifestPermission[];
  name: string;
  description: string;
  usedBy: string;
  icon: ComponentType<{ className?: string }>;
  required: boolean;
};

function permissionsOf(item: PermissionItem): chrome.runtime.ManifestPermission[] {
  return [item.id, ...(item.alsoNeeds ?? [])];
}

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
    alsoNeeds: ["tabs"],
    name: "Recently closed tabs",
    description:
      "Lists recently closed tabs in Quick Access. Chrome only reveals their titles and addresses to extensions that can read tab details, so this asks for both.",
    usedBy: "Quick Access",
    icon: Clock,
    required: false,
  },
  {
    id: "tabs",
    name: "Open tabs",
    description:
      "Lists your open tabs in Quick Access so you can switch to, close or mute one. Lux never injects into a tab or follows what you browse.",
    usedBy: "Quick Access",
    icon: AppWindow,
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
    id: "unlimitedStorage",
    name: "Unlimited local storage",
    description:
      "Lifts the browser's storage cap so background images and cached widget data fit on disk.",
    usedBy: "Backgrounds",
    icon: Database,
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
    <SettingsSection title="Permissions">
      {!available && (
        <p className="text-ink-3 text-caption">
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
          checked={permissionsOf(permission).every((name) => granted.has(name))}
          disabled={!available}
          onToggle={(enabled) =>
            void setPermissionsGranted(permissionsOf(permission), enabled, {
              reopenSettings: true,
            })
          }
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
    <span
      className="
        text-ink-4 text-micro mt-2 px-0.5 font-semibold tracking-wider uppercase
        first:mt-0
      "
    >
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
      <Icon className="text-ink-3 size-6 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="text-body font-medium">{permission.name}</span>
          <span className="bg-muted/70 text-ink-3 rounded px-1 py-px text-micro font-medium">
            {permission.usedBy}
          </span>
        </span>
        <span className="text-ink-3 text-caption">{permission.description}</span>
      </div>
      {required ? (
        <span
          className="
            border-border/60 text-ink-3 text-micro shrink-0 rounded-full border px-2 py-0.5
            font-medium
          "
        >
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
