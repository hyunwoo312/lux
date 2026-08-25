import { create } from "zustand";

export const TOAST_DURATION_MS = 8000;

export type ToastAction =
  | { kind: "undo"; run: () => void }
  | { kind: "action"; label: string; run: () => void };

export type Toast = {
  key: string;
  message: string;
  note?: string;
  action?: ToastAction;
  onExpire?: () => void;
};

type ToastState = {
  toast: Toast | null;
  show: (toast: Toast) => void;
  expire: () => void;
  runAction: () => void;
};

export const useToastStore = create<ToastState>()((set, get) => ({
  toast: null,
  show: (toast) => {
    get().expire();
    set({ toast });
  },
  expire: () => {
    const current = get().toast;
    if (!current) return;
    set({ toast: null });
    current.onExpire?.();
  },
  runAction: () => {
    const current = get().toast;
    if (!current?.action) return;
    set({ toast: null });
    current.action.run();
  },
}));

export function showToast(toast: Toast): void {
  useToastStore.getState().show(toast);
}
