# H3_STAGE3J_VALIDATION_GATES_GUIDE

Date:
April 5, 2026

Stage:
3J — Workflow Creation Intelligence

Purpose:
Freeze the real-repo validation discipline used to close Stage 3J.

## Authoritative closure baseline
- repo: ArqonMaestro
- branch: feature/h3
- commit: 36b6d39

## Required real-repo validation order

### Gate 1 — TypeScript compile
```bash
cd maestro/client && npx tsc --noEmit
```

### Gate 2 — Standing 3J/H3 workflow suite
```bash
cd maestro/client && npx jest --config jest.config.js --runInBand   src/test/audio/workflow-draft-artifacts.unit.spec.ts   src/test/audio/chunk-manager-h3-workflow-draft-artifacts.unit.spec.ts   src/test/audio/workflow-candidate-policy-timing.unit.spec.ts   src/test/audio/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts   src/test/audio/workflow-candidate-rubrics.unit.spec.ts   src/test/audio/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts   src/test/audio/workflow-candidate-scoring.unit.spec.ts   src/test/audio/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts   src/test/audio/workflow-skeleton-inference.unit.spec.ts   src/test/audio/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts   src/test/audio/workflow-candidate-discovery.unit.spec.ts   src/test/audio/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts   src/test/audio/workflow-memory-observation.unit.spec.ts   src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts   src/test/audio/dynamic-precision-regimes.unit.spec.ts   src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts   src/test/audio/counterfactual-repair-intelligence.unit.spec.ts   src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts   src/test/audio/multi-resolution-atlas.unit.spec.ts   src/test/audio/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts   src/test/audio/policy-shaped-atlas-shards.unit.spec.ts   src/test/audio/chunk-manager-h3-atlas-shard.unit.spec.ts   src/test/audio/focus-conditioned-command-context.unit.spec.ts   src/test/audio/chunk-manager-h3-focus-context.unit.spec.ts   src/test/audio/voice-semantic-address-registry.unit.spec.ts   src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts   src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts
```

### Gate 3 — Standing timing validator
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py
```

## Closure expectations

Stage 3J closure is only valid when:
- all three gates pass on the real repo
- workflow creation remains separate from execution
- no persisted storage backend was silently introduced
- no execution semantics were introduced
- docs and runtime schema remain aligned with the live green branch

## Future regression rule

Any later slice that changes 3J workflow-creation behavior should rerun:
- Gate 1
- Gate 2
- Gate 3

and must preserve:
- workflowCandidateDiscovery*
- workflowSkeletonInference*
- workflowCandidateScoring*
- workflowCandidatePolicy*
- workflowCandidateTiming*
- workflowDraftArtifact*
- workflowLibraryApi*
- workflowMemoryReuse* compatibility

## Stop rule

On future post-closure work:
- stop on first failure
- repair microscopically
- treat the repaired green real-repo state as authoritative
