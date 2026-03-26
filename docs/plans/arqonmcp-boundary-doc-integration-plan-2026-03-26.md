# ArqonMCP Boundary Documentation Integration Plan

**Date:** 2026-03-26  
**Objective:** Integrate the updated boundary decision across Maestro docs before deeper coding.

## Decision Summary

- Maestro remains the voice-native interaction and actuation surface.
- ArqonMCP owns workflow orchestration and capability routing.
- Nexus owns deliberation and intent refinement.

## Priority A (canonical docs)

1. `docs/architecture/nexus-maestro-arqonmcp-boundary.md` (new)
2. `docs/index.md`
3. `docs/vision/voice-operating-system.md`
4. `docs/overview/ecosystem.md`
5. `docs/architecture/maestro-actuation-and-control-stack.md`
6. `docs/architecture/ultimate-vos-reference-architecture.md`
7. `docs/vos/ultimate-vos-reference-architecture.md`
8. `docs/vos/maestro-master-plan.md`
9. `docs/vos/maestro-workflow-contract.md`
10. `docs/vos/maestro-workflow-contract-service.md`
11. `docs/vos/README.md`
12. `docs/vos/VOS_DOCUMENTATION_SORTING.md`
13. `docs/speech/command-lane-architecture-memo.md`

## Priority B (sync docs)

- `docs/decision-log.md`
- `docs/overview/arqon-ecosystem-technotes.md`
- `docs/architecture/maestro-computational-fabric.md`

## Integration Rules

- Do not describe Maestro as the primary workflow orchestrator.
- Use "invoke/mediate" for Maestro and "orchestrate/route/compose" for ArqonMCP.
- Keep Nexus language focused on planning/deliberation.
- Preserve deterministic command-lane and policy-gated actuation phrasing.

## Completion Criteria

- Canonical docs reflect the same three-part ownership model.
- No contradictory wording in top-level identity/boundary docs.
- New boundary technote is linked from VOS/architecture entry docs.

## Execution Status (This Pass)

- Priority A: completed
- Priority B: partially completed (`docs/decision-log.md` synced; broader secondary sweeps remain optional follow-on)
