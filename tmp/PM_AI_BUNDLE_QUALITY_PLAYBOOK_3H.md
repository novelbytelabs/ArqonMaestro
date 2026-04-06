# PM AI Bundle Quality Playbook (Stage 3H)

## Purpose
Use this checklist before sending any new Stage 3H bundle so integration is green on first apply.

## Current Reality (from real local gates)
- Both OLD and NEW 3H-S2 bundles passed `tsc`.
- Both failed the full Jest integration gate.
- Failures cluster in chunk-manager-integrated suites, not helper-only suites.
- NEW PM bundle was slightly worse in test count than OLD PM bundle.

## What This Means
- The problem is not packaging or hash discipline.
- The problem is integration behavior in `chunk-manager` evidence/flow paths.
- Helper modules can look correct while real integration still breaks.

## Non-Negotiable Doctrine
- Advisory-only shaping and escalation proposals.
- No authority change.
- No H23/H24 bypass.
- No Stage 3A activation drift.
- No persistence/distributed cache.
- No Turbo/Tight/Ultra actuation yet.
- Protobuf/type-directed internals only; JSON is human-facing only.

## Required Bundle Contract
For each slice, provide:
1. Exact file list.
2. Exact SHA256 + bytes for each copied file.
3. A minimal structural proof note.
4. Explicit expected gate outcomes (not just claims).

## Preflight Checklist (PM AI must run before shipping bundle)
1. Validate all changed files compile under real repo `tsc` assumptions.
2. Run target suite for touched feature.
3. Run full cross-surface Jest gate used by integration operator.
4. Confirm no regression in chunk-manager evidence emission shape.
5. Confirm no test contamination from module scope/mocks.

If any item fails, do not ship bundle as “ready”.

## 3H-S2 Specific Integration Risks
- `chunk-manager` evidence payload keys drifting from test expectations.
- Derived regime fields computed but not emitted.
- Emission defaults (`null` vs `undefined`) breaking objectContaining assertions.
- Side effects in tests leaking across suites (module scope or mock resets).

## Concrete Hardening Rules for PM AI
1. When adding new evidence fields, update all three consistently:
   - runtime derivation helper
   - `chunk-manager` emission payload
   - runtime evidence schema/type normalizer
2. Add one chunk-manager proof test that asserts full field presence for:
   - eligible path
   - not-eligible path
3. Keep object shape stable for existing suites; do not remove or rename existing keys.
4. Avoid introducing test-global state that affects non-3H suites.

## Required Gate Set Before PM Marks Slice Green
1. `cd maestro/client && npx tsc --noEmit`
2. Full Jest gate (same 13-suite command used by integration operator)
3. `conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py`

## Output Format PM AI Must Use
1. Applied files
2. SHA verification table
3. Commands run (exact)
4. PASS/FAIL per gate
5. If failed: smallest real defect surface
6. Doctrine compliance check

## Decision Rule for Next 3H Iteration
- Do not advance to 3H-S3 until 3H-S2 is green on full Jest gate.
- If red, ship fix bundle targeted only to failing defect surface.
- No broad rewrites while in fix cycle.

## Message Template PM AI Can Reuse
"This bundle is not merge-ready until full integration gate passes in the real repo. Structural proof and unit-local success are necessary but not sufficient; chunk-manager cross-surface tests are the release truth."
