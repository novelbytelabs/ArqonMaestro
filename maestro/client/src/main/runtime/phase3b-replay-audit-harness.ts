import { phase3BReplayAuditService } from "./phase3b-replay-audit-service";

export const getPhase3BReplayAuditSnapshot = () => phase3BReplayAuditService.getSnapshot();
export const getPhase3BReplayAuditSummary = () => phase3BReplayAuditService.getSummary();

export const resetPhase3BReplayAuditSnapshot = () => phase3BReplayAuditService.reset();
