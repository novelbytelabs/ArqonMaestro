# H4 Plan — Authority Transition Rollout

## Status
- Branch: `feature/h4`
- Current authoritative green baseline: `27e7c7f`
- H4-S1: complete
- H4-S2: complete
- H4-S3: complete
- H4-S4: complete
- H4-S5: active
- H4-S6: next

## H4-S5 — Live-Use Hardening + Fallback Discipline

### Mission
Exercise the development-authoritative command-lane path under real microphone usage and harden only what live use proves broken.

### Scope
- real microphone session protocol
- fallback invocation verification
- rollback trigger verification
- live-session evidence capture
- issue triage discipline
- microscopic repair policy
- no UX/UI work
- no speculative runtime broadening

### Required outputs
- `docs/h4/H4_LIVE_USE_HARDENING_PROTOCOL.md`
- `docs/h4/H4_LIVE_SESSION_LOG_TEMPLATE.md`
- `docs/h4/H4_GATES_AND_FALLBACKS.md`
- `docs/h4/H4_PLAN.md`

### Exit condition
H4-S5 is complete only when real microphone sessions have been run against the authoritative path and any failures have either:
- been repaired microscopically on the real repo, or
- been explicitly logged as remaining issues with fallback behavior verified.

## H4-S6 — Closure / Validation / Freeze

### Mission
Freeze the H4 authority position after real microphone use proves the path operational in development.

### Required closure truth
- live mic uses the new path by default
- command-lane authority spine is primary
- broad runtime authority is active
- fallback remains explicit, logged, and reversible
- real live-use evidence exists
