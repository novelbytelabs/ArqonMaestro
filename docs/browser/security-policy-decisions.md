# Browser Voice Security Decisions (Ground Truth)

This document captures design decisions, rationale, and nuanced behavior for browser voice security.

Its purpose is continuity: future design iterations should start here before changing policy.

## Decision Record

## D-001: Interaction State Separation

Decision:

- Keep distinct states: `heard`, `activated`, `executed`.

Rationale:

- Prevents false security transitions from ambient transcript noise.
- Enables precise auditability and user-visible semantics.

Implications:

- `heard` can display text without triggering downgrade.
- `activated` is security-relevant regardless of execution outcome.

## D-002: Downgrade Trigger Semantics

Decision:

- No downgrade on heard-only events.
- Downgrade is allowed only after command activation events that fail trust policy.

Rationale:

- TV/background speech may appear in transcript but should not destabilize session mode unless activation occurs.

Implications:

- Reduces false mode churn.
- Makes downgrade deterministic and explainable.

## D-003: Pilot Unknown-Speaker Handling

Decision:

- In `PILOT`, unknown speaker activation causes immediate downgrade to `ASSIST`, then command is evaluated under Assist rules.

Rationale:

- Pilot should remain high-trust, but downgrade should preserve continuity rather than hard-stop all operation.

Implications:

- Unknown speaker does not continue with Pilot-level posture.
- Transition reason must be auditable.

## D-004: Pilot Restoration

Decision:

- Restore previous verified-speaker mode automatically after any successful verification event.

Rationale:

- Avoids unnecessary manual recovery friction.
- Keeps mode behavior tied to verified speaker presence.

Implications:

- Runtime stores previous verified mode.
- Restoration requires trusted evidence, not UI toggle.

## D-005: Assist Unknown-Speaker Policy

Decision:

- In `ASSIST`, unknown speaker executable commands are blocked until verification.

Rationale:

- Safety-first posture; avoids accidental execution by nearby speakers.

Implications:

- Low-risk commands are also blocked for unknown speakers in Assist.
- Non-executing events remain allowed.

## D-006: Fail-Closed for Contamination/Provider Degradation

Decision:

- For `contaminated` or `provider_degraded`, permit reflex-only behavior.

Rationale:

- Safety and security over convenience.
- Unreliable identity evidence cannot authorize actuation.

Implications:

- Low/medium/high actuation is blocked.
- Reflex commands remain available for operator safety.

## D-007: Grace Window

Decision:

- Medium-risk grace is `5s`, Assist-only.

Rationale:

- Small UX relief while limiting stale trust carry-over.

Implications:

- Pilot remains stricter for medium-risk.
- Grace token invalidation is aggressively enforced.

## D-008: Grace Invalidation Events

Decision:

- Invalidate grace on:
  - activation
  - trust-state change
  - contamination
  - provider degradation
  - context/surface jump
  - pause->listen transition
  - timeout

Rationale:

- Minimize trust leakage across uncertain conditions.

Implications:

- Short-lived trust continuity only in stable conditions.

## D-009: Pause/Listen Boundary Security

Decision:

- Every `Paused -> Listening` transition clears grace and requires fresh auth context for medium/high execution.

Rationale:

- Prevents stale auth assumptions across listening state transitions.

Implications:

- Listening toggles are security boundaries.

## D-010: Profile Runtime Authority Model

Decision:

- Profiles are managed via CRUD UI, but runtime authority is inferred per interaction from voice evidence.
- No persistent manual runtime activation.

Rationale:

- Persistent active-profile selection increases spoof/hand-off risk.

Implications:

- “Who is speaking now” drives policy, not “who was selected earlier.”

## D-011: Unknown Activation Rate Guard

Decision:

- `3 unknown activations / 10s` => `ASSIST -> LOCKED` for 30s.
- `5 unknown activations / 60s` => stay LOCKED until verified restoration event.

Rationale:

- Protect against repeated ambient activation loops.

Implications:

- System remains usable, but aggressively defensive under suspicious activation patterns.

## D-012: Title and Identity Display

Decision:

- Idle/paused title shows `Arqon Maestro`.
- Active interaction title displays speaker identity/trust indicator and can suppress app name text.

Rationale:

- Aligns user-visible output with current speaker trust context.

Implications:

- UX clarifies who is driving active interaction outcomes.

## D-013: Main UI Badge Scope

Decision:

- Main desktop app keeps existing semantics:
  - heard => displayed text
  - activated => highlighted
  - executed => checkmark
- Additional trust badges are allowed in security/profile/audit surfaces, not required in main pane.

Rationale:

- Preserve operator clarity without overloading primary interaction UI.

## D-014: Auditability Contract

Decision:

- Every relevant decision emits machine-readable reason codes and interaction metadata.

Rationale:

- Enables reconstruction, safety review, and future governance.

Implications:

- See reason code taxonomy below.

## Reason Code Taxonomy (v1)

Use stable code format:

- `<stage>_<event>_<decision>[_qualifier]`

### Ingress

- `ingress_heard_no_transition`
- `ingress_partial_ignored`
- `ingress_noise_filtered`
- `ingress_duplicate_suppressed`

### Activation

- `activation_candidate_rejected_low_confidence`
- `activation_candidate_rejected_shape_invalid`
- `activation_candidate_rejected_parser_mismatch`
- `activation_detected_verified`
- `activation_detected_unknown`
- `activation_detected_contaminated`
- `activation_detected_provider_degraded`
- `activation_debounce_rate_limited`

### Grace

- `grace_created_medium_assist`
- `grace_invalidated_activation`
- `grace_invalidated_speaker_change`
- `grace_invalidated_contamination`
- `grace_invalidated_provider_degraded`
- `grace_invalidated_context_jump`
- `grace_invalidated_pause_to_listen`
- `grace_expired_timeout`

### Mode transitions

- `mode_transition_pilot_to_assist_unknown_activation`
- `mode_transition_assist_to_locked_unknown_rate_limit`
- `mode_transition_restore_verified_event`
- `mode_transition_manual_locked`
- `mode_transition_noop_already_in_mode`

### Authentication / verification

- `auth_required_unknown_speaker`
- `auth_required_reauth_next`
- `auth_required_medium_risk`
- `auth_required_high_risk`
- `auth_success_verified_primary`
- `auth_success_verified_secondary`
- `auth_failure_no_match`
- `auth_failure_low_confidence`
- `auth_failure_contaminated`
- `auth_failure_provider_unavailable`

### Authorization

- `authorize_allow_verified_policy_match`
- `authorize_block_unknown_assist_policy`
- `authorize_block_locked_mode`
- `authorize_block_observe_no_actuation`
- `authorize_block_fail_closed_contaminated`
- `authorize_block_fail_closed_provider_degraded`
- `authorize_block_risk_not_permitted`

### Execution

- `execute_started`
- `execute_suppressed_not_authorized`
- `execute_suppressed_requires_reauth`
- `execute_succeeded`
- `execute_failed_runtime_error`
- `execute_aborted_interruption`

### Enrollment/recovery

- `identity_reenroll_recommended_stale_profile`
- `identity_reenroll_recommended_repeated_failures`
- `identity_reenroll_recommended_confidence_drift`
- `identity_profile_not_found`
- `identity_profile_inactive`

## Known Open Questions (Intentional)

- Exact parser + transcript threshold values by command family.
- Whether unknown low-risk behavior should ever be relaxed in specific non-sensitive environments.
- Long-term persistence/retention strategy for profile and decision evidence.

These remain open by design and should not be changed implicitly in code.

## Change Control Rule

Policy changes must update both:

1. `browser/security-policy-matrix.md` (executable behavior)
2. `browser/security-policy-decisions.md` (rationale and provenance)

If one changes without the other, the update is incomplete.
