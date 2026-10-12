/** True when the event is aimed at something the user types into. */
export function isEditableTarget(target: EventTarget | null): boolean {
  // Events dispatched on window have the Window as target, which is not an Element.
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select")) return true;
  return target instanceof HTMLElement && target.isContentEditable;
}
