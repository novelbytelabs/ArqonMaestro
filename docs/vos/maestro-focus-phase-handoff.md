---
title: Focus Architecture v2 Branch Handoff
status: active
last_updated: 2026-03-15
---

# Focus Architecture v2 Branch Handoff

## Branch Information

- **Current branch**: `feature/focus-architecture-v2`
- **Parent branch**: `main` (after PR #1 merges)
- **Purpose**: Implement v0.1 focus architecture expansion

## What Was Done Before This Branch

### Phase 1 Completion (PR #1)
- Runtime spine extraction (Phase 1A)
- Runtime outcomes normalization (Phase 1B)  
- Actuation policy service + Talon adapter (Phase 1C)
- xdotool focus driver for Linux
- Focus target mappings and validation

### Focus Implementation Already In Place
- Application focus transfer via xdotool
- Focus history service ("return focus")
- Focus target mappings for validation
- Basic verification after transfer

## Current Focus Architecture Docs

| Document | Purpose |
|----------|---------|
| `maestro-focus-architecture-current.md` | Current implemented slice (Layers 2-3) |
| `maestro-focus-architecture-proposed.md` | v0.1 full architecture spec |
| `maestro-focus-gap-analysis.md` | Risk/difficulty assessment table |

## Recommended Implementation Order (from gap analysis)

### Tier 1: Safe Foundation (Start Here)
1. Verification step after focus transfer
2. Source-of-truth classification
3. Expanded history model

### Tier 2: Core Intelligence
4. Confidence scoring
5. Command contracts
6. Safety gating

### Tier 3: Surface Expansion
7. Pin mechanism
8. Region awareness
9. Modal detection

### Tier 4: Advanced Features
10. Chooser/disambiguation
11. Control focus tracking
12. Caret detection
13. Recovery engine
14. Semantic intent routing

## How to Resume Phase 2 After Focus Work

Phase 2A is "Identity and safety gating" per the roadmap.

After focus work is complete:

1. **Merge PR #1** (if not already merged)
2. **Switch to main** after PR #1 is merged
3. **Create new branch** from main for Phase 2A:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/phase2a-identity-safety
   ```
4. **Read handoff docs**:
   - `docs/vos/maestro-phase-1c-hard-close-handoff.md`
   - `docs/vos/maestro-project-roadmap.md`
   - `docs/vos/maestro-implementation-progress.md`

## Key Files for Focus Work

- `maestro/client/src/main/driver/stub.ts` - Focus driver implementation
- `maestro/client/src/main/execute/executor.ts` - Focus validation
- `maestro/client/src/main/execute/system.ts` - Focus target mappings
- `maestro/client/src/main/runtime/focus-history-service.ts` - History service
- `docs/vos/maestro-focus-gap-analysis.md` - Implementation roadmap

## Important Notes

- The focus driver uses xdotool on Linux - platform abstraction may be needed for other OSes
- Current focus is at Layers 2-3 (Application, Window) - need to expand to Layers 4-8
- Confidence scoring and safety gating are high-risk items - implement carefully
- The gap analysis document contains detailed risk assessments

## User Preferences (from Phase 1)

- No placeholders
- No shims
- No stubs
- No fake code
- Do real implementation work only
- Preserve app behavior while iterating
- Test as you go
- Update `/docs/vos` continuity docs as important decisions land
