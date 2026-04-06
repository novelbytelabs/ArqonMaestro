# H4 Plan — Authority Transition Rollout

## Document identity

Title:
Arqon Maestro H4 Plan

Project:
`H4`

Branch:
`feature/h4`

Role:
Live rollout tracker for promoting the H3/3J substrate into the authoritative development runtime path.

Purpose:
Turn the H4 constitution into an execution plan with:

- rollout mission
- authoritative baseline
- slice sequence
- live microphone proof targets
- fallback rules
- cutover milestones
- closure conditions

---

## 1. Project mission

H4 exists to make the completed H3/3J system the live authoritative command-lane runtime path in development.

The immediate objective is not UX/UI polish.
The immediate objective is to make the new system live, testable, and broadly authoritative under real microphone conditions.

---

## 2. Authoritative starting baseline

H4 starts from the green closed H3/3J baseline:

- repo: `ArqonMaestro`
- source branch baseline: `feature/h3`
- H3 closure commit: `7735a20`

H4 should continue on:

- working branch: `feature/h4`

Authoritative baseline rule:

The latest repaired, green, real-repo state on `feature/h4` becomes the source of truth for each next H4 slice.

---

## 3. Governing H4 doctrine

All H4 work must preserve these rules:

- the H3/3J path becomes the default command-lane authority in development
- live microphone testing is first-class
- fallback may run only if the authoritative path fails to produce a lawful final decision
- fallback must be explicit, logged, and reversible
- no silent dual-authority ambiguity
- no hidden rollback behavior
- no UX/UI-first detours before the runtime authority path is real
- no public-rollout safety theater; this is development-authoritative rollout
- repairs stay microscopic
- real-runtime truth outranks theoretical confidence

---

## 4. H4 stage status

Overall H4 status:
`H4-S3 ready`

Immediate top priority:
`live authoritative command-lane rollout from real microphone input`

Current implemented slice baseline:
`H4-S2 green on feature/h4`

---

## 5. H4 rollout sequence

Planned H4 slices:

- `H4-S1` — Authority Integration Map + Runtime Cutover Register
- `H4-S2` — Live Microphone Entry Integration
- `H4-S3` — Command-Lane Authority Spine Cutover
- `H4-S4` — Broad Runtime Authority Expansion
- `H4-S5` — Live-Use Hardening + Fallback Discipline
- `H4-S6` — Closure / Validation / Freeze

---

## 6. Slice tracker

### H4-S1 — Authority Integration Map + Runtime Cutover Register
Status:
`implemented`

Mission:
Define exactly where the new H3/3J path becomes authoritative, where fallback remains, and which runtime surfaces are in scope for H4.

Core scope:
- authority boundary map
- command-lane runtime cutover map
- primary vs fallback path register
- integration surfaces register
- fallback trigger register
- kill-switch / rollback register
- live mic entry-point map
- authoritative logging requirements

Primary outputs:
- `docs/h4/H4_AUTHORITY_INTEGRATION_MAP.md`
- `docs/h4/H4_GATES_AND_FALLBACKS.md`
- updated `docs/h4/H4_PLAN.md`

Must not do:
- no runtime cutover yet
- no mic integration yet
- no broad code changes beyond mapping/register artifacts

Exit condition:
H4-S1 is complete only when the repo has an explicit map of:
- what is authoritative
- what is fallback
- where cutover occurs
- how failure is logged
- how rollback is triggered

### H4-S2 — Live Microphone Entry Integration
Status:
`next`

Mission:
Route real microphone input into the new H3/3J command-lane authority path by default in development.

Core scope:
- live mic entry integration
- default path routing into the H3/3J command-lane flow
- evidence-chain visibility from mic ingress forward
- explicit authority-path marker
- explicit fallback-path marker

Exit condition:
A real microphone session can enter the new path as the default runtime authority input path.

### H4-S3 — Command-Lane Authority Spine Cutover
Status:
`not started`

Mission:
Make the new H3/3J path the actual command-lane decision authority in development.

### H4-S4 — Broad Runtime Authority Expansion
Status:
`not started`

Mission:
Expand the new authority path across the broader runtime surfaces that must trust it to behave as the real system.

### H4-S5 — Live-Use Hardening + Fallback Discipline
Status:
`not started`

Mission:
Use real microphone sessions to harden the authoritative path and verify that fallback remains explicit, logged, and reversible.

### H4-S6 — Closure / Validation / Freeze
Status:
`not started`

Mission:
Freeze the new authority position and declare the H4 path the development-authoritative command-lane baseline.

---

## 7. Immediate proof targets

The first real proof target of H4 is:

Can real microphone input flow into the H3/3J command-lane path as the default live authority and produce a lawful runtime decision?

The second proof target is:

If it fails, does fallback run explicitly, get logged, and remain reversible?

---

## 8. Authority boundaries

At the start of H4, the authoritative target is:

- command lane only
- live microphone ingress
- command-lane routing
- command-lane authority decisions
- command-lane evidence and diagnostics

The correct first authority zone is the live command loop.

---

## 9. Fallback rule

Constitutional fallback rule for all H4 slices:

If the authoritative path fails to produce a lawful final decision, fallback may run, but it must be explicit, logged, and reversible.

Operational implications:
- no silent fallback
- no mystery success from the legacy path
- no hiding authority failure
- no permanent fallback dependency disguised as cutover success

---

## 10. Observability requirements

Every H4 slice must preserve or improve observability for:

- mic ingress
- routing choice
- authority-path engagement
- authority-path failure, if any
- fallback invocation, if any
- final runtime decision
- whether the result came from authority or fallback

---

## 11. Required coding discipline for every H4 slice

Every H4 slice should follow the same operational discipline used successfully in H3/3J:

- one bounded slice only
- exact changed file list
- exact copy map
- exact apply prompt
- exact gates
- stop on first failure
- microscopic repairs only
- repaired green real-repo baseline becomes authoritative
- no broadening scope because of failure

---

## 12. Recommended real-repo gates for H4 slices

Unless a specific slice requires more, default H4 validation should continue to include:

1. `cd maestro/client && npx tsc --noEmit`
2. targeted `jest --runInBand` for:
   - the current H4 slice
   - standing H3/3J suites affected by authority integration
3. `cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py`

Additionally, H4 slices should accumulate live-runtime proof artifacts when relevant.

---

## 13. H4 success criteria

H4 is succeeding when these become true:

- real mic input uses the new path by default
- the new path governs command-lane decisions by default
- the old path is fallback only
- fallback is explicit, logged, and reversible
- live mic sessions produce meaningful runtime evidence
- real failures get repaired microscopically
- the system stops behaving like the new path is advisory

---

## 14. Known H4 risk zones

These must remain visible throughout rollout:

- authority ambiguity
- silent fallback
- false cutover confidence
- live-mic gap
- over-broad cutover
- observability weakness

---

## 15. Non-goals of H4

H4 is not intended to deliver:

- polished workflow UX/UI
- workflow inbox product surfaces
- library browsing UI
- sharing UI
- storage productization
- end-user onboarding polish

Those come after authority is real.

---

## 16. Closure rule

H4 may only be declared closed when:

- the new path is the development-authoritative command-lane runtime
- real microphone usage has proven it live
- fallback remains explicit, logged, and reversible
- real baseline is green
- authority boundaries are documented
- closure docs are aligned with the actual repo state

---

## 17. Immediate next move

The correct next implementation slice is:

`H4-S2` — Live Microphone Entry Integration

H4-S1 is the mapping/register slice that makes the live rollout explicit before runtime cutover.
