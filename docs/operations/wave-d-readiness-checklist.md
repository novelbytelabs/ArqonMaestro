# Wave D Readiness Checklist (D1 Gate)

Use this checklist before starting any live infrastructure cutover.

## Phase Gate

- [x] D1 inventory completed: `wave-d-ownership-inventory.md`
- [x] Every active external surface has an assigned owner
- [x] All unknown ownership entries resolved

## Technical Prerequisites

- [ ] Arqon-owned streaming hostname(s) created
- [ ] Arqon-owned update/artifact hostname(s) created
- [ ] TLS certificates provisioned for all new hostnames
- [ ] Health endpoint(s) defined and reachable for replacement services
- [ ] Artifact hosting supports versioned release files
- [ ] Integrity model defined (`sha256`, signatures, or equivalent)

## Runtime Safety Controls

- [ ] Endpoint selection is config-driven (no hardcoded cutover)
- [ ] Legacy endpoint fallback behavior explicitly defined
- [ ] Rollback switch exists and is documented
- [ ] Smoke test scripts can validate both runtime and update path

## Operational Readiness

- [ ] DNS change process and owner documented
- [ ] Certificate renewal responsibility documented
- [ ] Incident contact + escalation path documented
- [ ] Monitoring/alerting plan documented
- [ ] Change window and rollback window defined

## Documentation Readiness

- [x] User-facing docs do not claim Arqon endpoints that do not exist
- [x] Decision log updated for Wave D migration policy
- [x] Gotcha registry updated with new external infra traps

## Go/No-Go Rule

If any item above is unchecked, Wave D remains in D1 preparation mode and no live cutover should be attempted.

## Current Program Decision

Wave D is hard-closed as `prepared + deferred`:

- governance and ownership mapping are complete
- live migration is intentionally postponed
