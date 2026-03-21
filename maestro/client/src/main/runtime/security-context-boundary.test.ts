import { modalAwarenessService } from "./modal-awareness-service";
import { buildModalBoundaryKey, hasBoundaryJump } from "./security-context-boundary";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function run(): void {
  const noneContext = modalAwarenessService.noModalContext();
  const dialogContext = modalAwarenessService.classifyContext({
    modalContainerDetected: true,
    containerHint: "dialog",
    focusTrapDetected: true,
    backdropDetected: true,
    notificationDetected: false,
    quickOpenDetected: false,
  });
  const quickOpenContext = modalAwarenessService.classifyContext({
    modalContainerDetected: true,
    containerHint: "quick_open",
    focusTrapDetected: true,
    backdropDetected: false,
    notificationDetected: false,
    quickOpenDetected: true,
  });

  const noneKey = buildModalBoundaryKey(noneContext);
  const dialogKey = buildModalBoundaryKey(dialogContext);
  const quickOpenKey = buildModalBoundaryKey(quickOpenContext);

  assert(!hasBoundaryJump("", noneKey), "empty previous boundary should not trigger jump");
  assert(hasBoundaryJump(noneKey, dialogKey), "none -> dialog should trigger boundary jump");
  assert(hasBoundaryJump(dialogKey, quickOpenKey), "dialog -> quick_open should trigger boundary jump");
  assert(!hasBoundaryJump(dialogKey, dialogKey), "same boundary key should not trigger jump");

  assert(dialogKey.includes("active"), "dialog key should include active overlay");
  assert(quickOpenKey.includes("quick_open"), "quick_open key should encode modal type");

  console.log("✓ security context boundary utility detects modal boundary jumps deterministically");
}

run();
