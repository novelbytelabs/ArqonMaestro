import { phase3BReplayAuditService } from "./phase3b-replay-audit-service";

export const getPhase3BReplayAuditSnapshot = () => phase3BReplayAuditService.getSnapshot();

export const resetPhase3BReplayAuditSnapshot = () => phase3BReplayAuditService.reset();
