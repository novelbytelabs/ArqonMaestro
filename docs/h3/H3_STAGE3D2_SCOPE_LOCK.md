# H3 Stage 3D2 Scope Lock

Status: Active alignment doctrine lock
Applies to: `feature/h3-stage3d2-alignment-pack`

## Non-negotiable constraints

1. Warm hit may accelerate but may not authorize execution.
2. Live geometric evidence outranks cache memory.
3. No H23/H24 bypass is permitted.
4. No Stage 3A geometric activation drift.
5. No persistence/distributed cache in Stage 3D2.
6. No Turbo/Tight/Ultra work in Stage 3D2.
7. Scope remains validated v1 families only:
   - `pause`
   - `new tab`
   - `go to line`
   - `go to <target>`
   - `open <target>`

## Allowed Stage 3D2 behavior

- advisory warm apply/discard in pre-dispatch stages only:
  - candidate ranking
  - shortlist narrowing
  - tail strategy pre-arm

## Forbidden Stage 3D2 behavior

- cache-authorized execution
- any governance shortcut
- replacing live geometric truth with warmed memory
- persistence/distributed semantic cache roll-out

## Validation gate minimums

- `npx tsc --noEmit`
- targeted jest:
  - `voice-semantic-address-registry.unit.spec.ts`
  - `chunk-manager-h3-numeric-tail.unit.spec.ts`
  - `chunk-manager-h3-open-tail.unit.spec.ts`
- timing validator:
  - `conda run -n helios-gpu-118 python3 maestro/scripts/h3_stage3d2_validate_timing.py`

Gate outcome must demonstrate:
- advisory-only warm path
- clean warm-miss continuation
- no governance bypass
- no regression across v1 command families
