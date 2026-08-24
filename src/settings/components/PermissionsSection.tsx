import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PERMISSIONS, type PermissionItem } from "@/settings/permissions";
import { useGrantedPermissions } from "@/hooks/usePermission";
import { isPermissionsManageable, setPermissionsGranted } from "@/lib/permissions";
import { SettingsSection } from "@/settings/components/SettingsSection";
import { useSettingsStore } from "@/settings/useSettingsStore";

function permissionsOf(item: PermissionItem): chrome.runtime.ManifestPermission[] {
  return [item.id, ...(item.alsoNeeds ?? [])];
}

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
