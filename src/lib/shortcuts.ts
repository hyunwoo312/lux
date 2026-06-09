export type Shortcut = {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
};

const isMac =
  typeof navigator !== "undefined" && /mac/i.test(navigator.platform || navigator.userAgent);

const MODIFIER_KEYS = new Set(["Control", "Meta", "Shift", "Alt"]);

const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  escape: "Esc",
  enter: "Enter",
};

function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  return (
    (event.ctrlKey || event.metaKey) === shortcut.mod &&
    event.shiftKey === shortcut.shift &&
    event.altKey === shortcut.alt &&
    event.key.toLowerCase() === shortcut.key
  );
}

export function matchesAnyShortcut(event: KeyboardEvent, shortcuts: Shortcut[]): boolean {
  return shortcuts.some((shortcut) => matchesShortcut(event, shortcut));
}

export function shortcutFromEvent(event: KeyboardEvent): Shortcut | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  return {
    mod: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
    key: event.key.toLowerCase(),
  };
}

function formatKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  if (key.length === 1) return key.toUpperCase();
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export type ModifierState = Pick<Shortcut, "mod" | "shift" | "alt">;

export function modifierLabels(mods: ModifierState): string[] {
  const parts: string[] = [];
  if (mods.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (mods.alt) parts.push(isMac ? "⌥" : "Alt");
  if (mods.shift) parts.push(isMac ? "⇧" : "Shift");
  return parts;
}

export function shortcutKeyParts(shortcut: Shortcut): string[] {
  return [...modifierLabels(shortcut), formatKey(shortcut.key)];
}

export function isValidShortcut(shortcut: Shortcut): boolean {
  return shortcut.mod || shortcut.alt;
}

export function shortcutsEqual(a: Shortcut, b: Shortcut): boolean {
  return a.mod === b.mod && a.shift === b.shift && a.alt === b.alt && a.key === b.key;
}

export function formatShortcut(shortcut: Shortcut): string {
  return shortcutKeyParts(shortcut).join(isMac ? " " : " + ");
}
