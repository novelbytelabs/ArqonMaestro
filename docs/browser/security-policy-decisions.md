# Browser Voice Security Decisions (Ground Truth)

This document captures design decisions, rationale, and nuanced behavior for browser voice security.

Its purpose is continuity: future design iterations should start here before changing policy.

Startup/bootstrap and factor hierarchy authority is defined in:

- [Session Bootstrap and Root Trust](../security/session-bootstrap-root-trust.md)

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

## D-002: Per-Command Authentication Baseline

Decision:

- Every executable command requires authentication on that request.
- Only reflex safety commands (`stop`, `cancel`, `pause`) are exempt.

Rationale:

- Prevent stale or inherited identity from authorizing a different speaker.

Implications:

- No grace-period carry-over authorization.
- No reauth token reuse across requests.

## D-003: Unknown Speaker Handling

Decision:

- Unknown speaker recognized commands are blocked immediately.

Rationale:

- Safety and identity integrity are preferred over continuity.

Implications:

- No pilot degrade-then-eval default path for unknown speaker execution.
- Commands may still be heard/activated for observability, but not executed.

## D-004: Contamination / Provider Degraded Fail-Closed

Decision:

- For `contaminated` or `provider_degraded`, permit reflex-only behavior.

Rationale:

- Unreliable evidence cannot authorize actuation.

Implications:

- Low/medium/high executable commands are blocked.
- Reflex commands remain available.

## D-005: Profile Runtime Authority Model

Decision:

- Profiles are managed via CRUD UI, but runtime authority is inferred per interaction from voice evidence.
- No persistent manual runtime activation.

Rationale:

- Persistent active-profile selection increases spoof/hand-off risk.

Implications:

- “Who is speaking now” drives policy, not “who was selected earlier.”

## D-006: Title and Identity Display

Decision:

- Idle/paused title shows `Arqon Maestro`.
- During active interaction, title shows speaker identity label (verified profile name or `Unknown`).
- After execution/block completion, title reverts to `Arqon Maestro`.

Rationale:

- Align user-visible output with active speaker trust context.

## D-007: Main UI Badge Scope

Decision:

- Main desktop app keeps lifecycle semantics:
  - heard => displayed text
  - activated => highlighted
  - executed => checkmark
- Unknown/failure states may render stale indicators in lifecycle UI.

Rationale:

- Preserve operator clarity without overloading primary pane semantics.

## D-008: Auditability Contract

Decision:

- Every relevant decision emits machine-readable reason codes and interaction metadata.

Rationale:

- Enables reconstruction, safety review, and governance.

## D-009: App-Scoped Mode Authority

Decision:

- Operator mode (`pilot`, `assist`, `observe`, `locked`) is owned by the active app/window control surface.
- For browser interactions, extension mode is authoritative.

Rationale:

- Mode semantics are surface-bound; desktop-global mode selection causes policy drift and user confusion.

Implications:

- Desktop runtime consumes app-scoped mode updates from bridge channels.
- Mode changes must be attributed to app identity and resolved against focused app at execution time.

## D-010: Desktop Focused-App Mode Synchronization

Decision:

- Desktop authorization syncs to focused app mode before command authorization checks.

Rationale:

- Prevents desktop from being stuck in stale `assist`/other mode while active app is in a different policy posture.

Implications:

- Authorization and UI state (`securityPolicyMode`) reflect focused app effective mode.
- Command panel mode tint/label is derived from synced mode, not static desktop defaults.

## D-011: Passkey-First Root Trust

Decision:

- Root trust is passkey/WebAuthn first.
- TOTP is recovery-only, not primary normal-mode root trust.

Rationale:

- Stronger phishing resistance and cleaner startup trust semantics.

Implications:

- Cold-start root trust must be established by passkey (or policy-approved equivalent).
- Recovery paths are explicit and constrained.

## D-012: Profiles Own Security State, Not Provider Preferences

Decision:

- Profiles can manage enrolled factors and policy state.
- Profiles cannot store provider/browser/OS authenticator preference.

Rationale:

- Authentication routing is a platform/runtime concern, not a user preference concern.

Implications:

- No UI for selecting Apple/Google/Windows provider preference.
- Profile settings remain policy-centric and vendor-neutral.

## D-013: Authentication Chooses Profile

Decision:

- Successful authentication selects/activates profile context.
- Profile selection alone never implies authenticated trust.

Rationale:

- Prevent trust leakage from chooser UX or stale profile context.

Implications:

- Shared-machine startup requires explicit authentication after profile selection.
- No implicit trust carry-over across profile boundaries.

## D-014: Security Mutation Gate = Fresh Passkey

Decision:

- High-risk security mutations require fresh passkey in normal mode.
- PIN-only substitution is forbidden.

Rationale:

- Preserve factor-strength law at critical trust-boundary mutation points.

Implications:

- Passkey reset/factor mutation/disable-voice flows are strongly gated.
- Recovery can be used only via explicit recovery policy path.

## Reason Code Taxonomy (v2)

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

### Authentication / verification

- `auth_required_per_command`
- `auth_success_verified_primary`
- `auth_success_verified_secondary`
- `auth_block_unknown_speaker`
- `auth_block_identity_mismatch`
- `auth_block_provider_degraded`
- `auth_block_contaminated`
- `auth_failure_no_match`
- `auth_failure_low_confidence`

### Mode transitions

- `mode_transition_assist_to_locked_unknown_rate_limit`
- `mode_transition_manual_locked`
- `mode_transition_noop_already_in_mode`

### Execution

- `execute_succeeded`
- `execute_suppressed_not_authorized`
- `execution_failed`
- `execution_evidence_timeout`
- `execution_evidence_unavailable`
- `execution_unverified_or_unknown_speaker`
