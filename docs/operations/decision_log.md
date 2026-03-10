# Arqon Maestro Decision Log: STT Transport Migration

This log records critical technical decisions made during the recovery of the Voice Plane (Gate 1 & Gate 2).

| Date | Decision ID | Status | Decision | Rationale |
|------|-------------|--------|----------|-----------|
| 2026-03-09 | DEC-001 | APPROVED | Implement manual command extraction in `comparator.ts` | Fulfillment of Gate 1 requirement for command match rate reporting when Bus path doesn't natively speak SAS yet. |
| 2026-03-09 | DEC-002 | APPROVED | Vertical Pass of `addr_id` in `audio_append` | Maintains protocol consistency while allowing shadow comparison without breaking existing mirror. |
| 2026-03-10 | DEC-003 | APPROVED | Shadow Phase Coexistence | Proof of `stt.address.query` emission while `stt.audio.append` mirror is active (Dual-run safety). |
| 2026-03-10 | DEC-004 | APPROVED | 128-byte CFH Signatures | Alignment with Rust arqon_core implementation for 1024-bit deterministic hash matches. |
| 2026-03-10 | DEC-005 | APPROVED | Conservative Default Preservation | Maintaining `arqon_bus_enabled=false` until manual supervisor promotion. |

**Audit Trail Reference**: [walkthrough.md](file:///home/irbsurfer/.gemini/antigravity/brain/1a1b239c-fc01-41fb-8f57-a5d883c79bcc/walkthrough.md)
