import { ModalContext } from "./modal-awareness-service";

export function buildModalBoundaryKey(modalContext: ModalContext): string {
  return [
    modalContext.overlayState,
    modalContext.modalType || "none",
    modalContext.classification || "none",
    modalContext.blocksNonReflex ? "1" : "0",
    modalContext.focusTrapped ? "1" : "0",
  ].join(":");
}

export function hasBoundaryJump(previous: string, current: string): boolean {
  if (!previous || !current) {
    return false;
  }
  return previous !== current;
}
