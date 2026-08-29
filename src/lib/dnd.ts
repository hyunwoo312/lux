import type { KeyboardCodes, Modifier } from "@dnd-kit/core";
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export const VERTICAL_LIST_MODIFIERS: Modifier[] = [
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
];

export const GRID_MODIFIERS: Modifier[] = [restrictToParentElement];

const KEYBOARD_CODES: KeyboardCodes = {
  start: ["Space"],
  cancel: ["Escape"],
  end: ["Space", "Enter", "Tab"],
};

export function useSortableSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: KEYBOARD_CODES,
    }),
  );
}

export function moveById<T>(
  items: readonly T[],
  activeId: string,
  overId: string,
  getId: (item: T) => string,
): T[] | null {
  const from = items.findIndex((item) => getId(item) === activeId);
  const to = items.findIndex((item) => getId(item) === overId);
  if (from === -1 || to === -1 || from === to) return null;
  return arrayMove([...items], from, to);
}
