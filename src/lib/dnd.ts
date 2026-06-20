import type { Modifier } from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";

export const VERTICAL_LIST_MODIFIERS: Modifier[] = [
  restrictToVerticalAxis,
  restrictToFirstScrollableAncestor,
];

export const GRID_MODIFIERS: Modifier[] = [restrictToParentElement];
