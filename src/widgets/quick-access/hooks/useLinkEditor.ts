import { useLayoutEffect, useRef, useState, type DragEvent } from "react";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";
import { useQuickAccessStore } from "@/widgets/quick-access/useQuickAccessStore";
import { droppedLink } from "@/widgets/quick-access/lib/drop-link";
import { keyOf } from "@/widgets/quick-access/lib/url";
import { showToast } from "@/stores/useToastStore";
import type { LinkResult, QuickLink } from "@/widgets/quick-access/types";

type FormState = { mode: "add"; url?: string } | { mode: "edit"; link: QuickLink };

export function useLinkEditor(editing: boolean) {
  const instanceId = useWidgetInstanceId();
  const root = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const returnTo = useRef<string | null>(null);
  const returning = useRef(false);
  const close = () => {
    returning.current = true;
    setForm(null);
  };
  useLayoutEffect(() => {
    if (form || !returning.current) return;
    returning.current = false;
    const anchors = [...(root.current?.querySelectorAll<HTMLElement>("[data-pin-id]") ?? [])];
    const anchor = anchors.find((element) => element.dataset.pinId === returnTo.current);
    (anchor ?? root.current?.querySelector<HTMLElement>('[aria-label="Add link"]'))?.focus({
      preventScroll: true,
    });
  }, [form]);
  const add = () => {
    returnTo.current = null;
    setForm({ mode: "add" });
  };
  const edit = (link: QuickLink) => {
    returnTo.current = link.id;
    setForm({ mode: "edit", link });
  };
  const submit = (title: string, url: string): LinkResult => {
    const store = useQuickAccessStore.getState();
    const result =
      form?.mode === "edit"
        ? store.editLink(instanceId, form.link.id, title, url)
        : store.addLink(instanceId, title, url);
    if (result === "ok") {
      returnTo.current =
        useQuickAccessStore
          .getState()
          .byInstance[instanceId]?.links.find((link) => keyOf(link.url) === keyOf(url))?.id ?? null;
      close();
    }
    return result;
  };
  const accepts = (event: DragEvent) =>
    !event.dataTransfer.types.includes("Files") &&
    event.dataTransfer.types.some((type) => type === "text/uri-list" || type === "text/plain");
  const onDragEnter = (event: DragEvent) => {
    if (!accepts(event) || editing || form) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (!dragDepth.current) setDragging(false);
  };
  const onDragOver = (event: DragEvent) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = editing || form ? "none" : "copy";
  };
  const onDrop = (event: DragEvent) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    if (editing || form) return;
    const url = droppedLink(event.dataTransfer);
    if (!url) {
      showToast({
        key: `quick-access-drop:${instanceId}`,
        message: "Drop one http or https link at a time.",
      });
      return;
    }
    returnTo.current = null;
    setForm({ mode: "add", url });
  };
  return {
    root,
    form,
    dragging,
    add,
    edit,
    close,
    submit,
    dropEvents: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
