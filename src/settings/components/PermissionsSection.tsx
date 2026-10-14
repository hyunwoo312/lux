import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PERMISSIONS, type PermissionItem } from "@/settings/permissions";
import { useGrantedPermissions } from "@/hooks/usePermission";
import { isPermissionsManageable, setPermissionsGranted } from "@/lib/permissions";
import { ConfigSection } from "@/components/config/Config";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { TYPE } from "@/lib/type";
import { PERMISSION_LIST } from "@/settings/rows";

function permissionsOf(item: PermissionItem): chrome.runtime.ManifestPermission[] {
  return [item.id, ...(item.alsoNeeds ?? [])];
}

export function PermissionsSection() {
  const available = isPermissionsManageable();
  const granted = useGrantedPermissions();
  const highlight = useSettingsStore((s) => s.permissionHighlight);
  const clearHighlight = useSettingsStore((s) => s.clearPermissionHighlight);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const reduced = useReducedMotion();

  const optional = PERMISSIONS.filter((permission) => !permission.required);
  const required = PERMISSIONS.filter((permission) => permission.required);

  useEffect(() => {
    if (!highlight) return;
    const row = rowRefs.current.get(highlight);
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    const timer = window.setTimeout(() => clearHighlight(), 2200);
    return () => window.clearTimeout(timer);
  }, [highlight, clearHighlight, reduced]);

  const registerRow = (id: string) => (el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };

  return (
    <ConfigSection settingId={PERMISSION_LIST.settingId} title={PERMISSION_LIST.title}>
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
          toggle={{
            checked:
              granted !== null && permissionsOf(permission).every((name) => granted.has(name)),
            disabled: !available,
            onToggle: (enabled) =>
              void setPermissionsGranted(permissionsOf(permission), enabled, {
                reopenSettings: true,
              }),
          }}
        />
      ))}

      <SubLabel>Required</SubLabel>
      {required.map((permission) => (
        <PermissionRow
          key={permission.id}
          rowRef={registerRow(permission.id)}
          permission={permission}
          highlighted={highlight === permission.id}
          toggle={null}
        />
      ))}
    </ConfigSection>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return <span className={cn(TYPE.eyebrow, "text-ink-4 mt-2 px-0.5 first:mt-0")}>{children}</span>;
}

type PermissionToggle = {
  checked: boolean;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
};

function PermissionRow({
  rowRef,
  permission,
  highlighted,
  toggle,
}: {
  rowRef?: (el: HTMLDivElement | null) => void;
  permission: PermissionItem;
  highlighted: boolean;
  toggle: PermissionToggle | null;
}) {
  const Icon = permission.icon;
  return (
    <div
      ref={rowRef}
      data-setting-id={`${PERMISSION_LIST.settingId}.${permission.id}`}
      tabIndex={-1}
      className={cn(
        "-mx-2 flex scroll-m-4 items-center gap-3 rounded-lg px-2 py-2 transition-colors",
        highlighted && "bg-primary/10 ring-primary/40 ring-2",
      )}
    >
      <Icon className="text-ink-3 size-6 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-body font-medium">{permission.name}</span>
          <span className="bg-foreground/8 text-ink-2 rounded-xs px-1 py-px text-micro font-medium">
            {permission.usedBy}
          </span>
        </span>
        <span className="text-ink-3 text-caption">{permission.description}</span>
      </div>
      {toggle === null ? (
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
          checked={toggle.checked}
          disabled={toggle.disabled}
          onCheckedChange={(value) => toggle.onToggle(value === true)}
          aria-label={`Allow ${permission.name.toLowerCase()}`}
        />
      )}
    </div>
  );
}
