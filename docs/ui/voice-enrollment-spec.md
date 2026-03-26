# Voice Enrollment Specification v1

## Purpose

This document defines the concrete enrollment protocol for Maestro voice biometrics. It replaces the button-centric "Security tab setup" with a proper biometric lifecycle protocol.

---

## Core Design Principles

### Principle 1: Enrollment Is a Protocol, Not a Button

Enrollment must follow a structured sequence: consent → preflight → capture → quality gates → training → verification → ready.

### Principle 2: Contamination Is a Reject Rule

During enrollment, contamination is a hard reject condition, not just a runtime status. Overlap and multi-speaker audio must cause immediate take rejection.

### Principle 3: Thresholds Are Calibrated, Not Hardcoded

Runtime scoring uses mode-aware calibration: Normal, Shared Room, Secure, Restricted each have different decision boundaries.

### Principle 4: Voice Is One Factor, Not the Sole Authority

Voice alone should not authorize the highest-risk actions. Step-up with additional factors is required for destructive commands.

---

## State Machine

```
NotEnrolled → ConsentRequired → PreflightReady → Capturing → TakeRejected/TakeAccepted → Enrolling → Training → MinimumProfileReady → Verified → Hardened → Stale → ReenrollmentRecommended → Expired → OptedOut
```

### State Definitions

| State | Description |
|-------|-------------|
| NotEnrolled | No voice profile exists |
| ConsentRequired | User must acknowledge consent before capture |
| PreflightReady | Microphone and room conditions are acceptable |
| Capturing | Active audio capture in progress |
| TakeRejected | Last take failed quality checks |
| TakeAccepted | Last met minimum quality threshold |
| Enrolling | Accumulating accepted takes toward minimum |
| Training | Building voice model from accepted audio |
| MinimumProfileReady | Minimum threshold met, needs verification |
| Verified | Passed fresh verification test |
| Hardened | Additional speech collected, profile is robust |
| Stale | Profile exists but freshness window expired |
| ReenrollmentRecommended | Profile quality degraded, recommend refresh |
| Expired | Profile unused beyond retention period |
| OptedOut | User explicitly opted out |

---

## Screen Flow

### Screen 1: Consent

* Display what is stored (voiceprint template, not raw audio)
* Display how to delete it
* Display what voice can and cannot authorize
* Explicit opt-in checkbox required
* Link to full privacy policy

### Screen 2: Preflight

* Microphone selection and level meter
* Room noise floor indicator
* Clip/no-clip indicator
* Single-speaker confirmation
* "Start Only When Ready" button

Checks to perform:

* mic exists and stable
* no clipping
* signal level healthy
* background noise acceptable
* only one speaker detected
* 16 kHz mono PCM path confirmed

### Screen 3: Guided Capture

* Progress indicator: "Take 2 of 6"
* Time remaining in current take
* Real-time audio level visualization
* Prompt text display (for prompted takes)
* Free speech instruction (for unprompted takes)
* Stop button

Target: 30 seconds of net accepted speech across 4-6 takes.

### Screen 4: Per-Take Feedback

After each take, display result:

* **Accepted** — green check, speech length shown
* **Too Short** — red X, minimum duration required
* **Too Little Pure Speech** — red X, silence ratio too high
* **Clipping Detected** — red X, audio clipped
* **Low SNR** — red X, noise too high relative to speech
* **Overlap Detected** — red X, multiple speakers
* **Silence-Heavy** — red X, not enough speech
* **Device Changed** — red X, audio device changed mid-take
* **Spoof Suspected** — red X, replay or synthesis detected

### Screen 5: Profile Build

* "Building your voice profile..."
* Progress indicator for model training
* Do not allow interruption

### Screen 6: Post-Enrollment Verification

* "Speak to verify your voice"
* Fresh prompt phrase (different from enrollment prompts)
* 10 seconds of speech required for verification
* Result: pass or fail

### Screen 7: Completion

* Success message
* Explanation of what happens next
* Link to Security tab as runtime dashboard
* Reminder of deletion path

---

## Backend Requirements

### Capture Contract

* **Enrollment minimum:** 30 seconds of net speech (excludes silence)
* **Verification minimum:** 10 seconds of net speech
* **Audio format:** 16 kHz mono PCM
* **Per-take duration:** 6-10 seconds

### Quality Gates

| Condition | Enrollment | Verification |
|-----------|-------------|---------------|
| Too short | reject | reject |
| Clipping | reject | soft warn |
| Low SNR (<2 dB) | reject | soft warn |
| Overlap detected | reject | hard reject |
| Multiple speakers | reject | hard reject |
| Silence ratio >70% | reject | reject |
| Device changed mid-take | reject | reject |
| Spoof suspected | reject | hard reject |

### Profile Storage

* Use opaque internal IDs (UUID)
* Do not use PII as canonical profile key
* Encrypt voice templates at rest
* Store under customer-managed keys where possible

### Calibration Model

```
raw_similarity → AS-Norm → calibrated_score → mode_policy → decision
```

Mode-specific thresholds:

* Normal: base threshold + standard penalty
* Shared Room: base threshold + contamination penalty + freshness penalty
* Secure: base threshold + factor requirement
* Restricted: require step-up regardless of score

---

## Runtime Behavior

### Freshness Decay

* Trusted voice state decays over hours (not weeks)
* Short-term cache: minutes
* Long-term trust: hours
- Step-up required when transitioning between trust levels

### Step-Up Model

| Action Type | Required Verification |
|------------|----------------------|
| Low-risk command | Recent voice match (within freshness window) |
| Medium-risk command | Fresh voice match (<15 min) |
| High-risk command | Fresh voice + additional factor |
| Destructive action | Never voice-only; always multi-factor |

### Retention

* Unused profiles auto-expire after 1 year
* Local verification cache expires after 14 days
* Explicit delete removes all biometric material
* Unenroll is available at any time

---

## Security Considerations

### What Voice Can Do

* Unlock convenience features
* Provide continuous ownership evidence
* Influence authority decisions
* Act as one factor in step-up

### What Voice Should NOT Do Alone

* Authorize destructive actions (delete, revoke, suspend)
* Override security policy
* Bypass fresh passkey requirement for security mutations

### Presentation Attack Defense

* Liveness detection for enrollment and verification
* Replay attack detection
* Synthesis attack detection (if feasible)
* Continuous authentication monitoring

---

## Acceptance Tests

1. [ ] Enrollment cannot complete without explicit consent
2. [ ] Enrollment cannot complete if overlap/multi-speaker is detected
3. [ ] Enrollment displays accepted speech duration, not just success/fail
4. [ ] Enrollment distinguishes Enrolling, Training, Verified states
5. [ ] Verification requires fresh speech, separate from enrollment audio
6. [ ] Profile IDs are opaque, not PII-based
7. [ ] Thresholds vary by policy mode (Normal, Shared Room, Secure, Restricted)
8. [ ] High-risk actions require step-up, not voice alone
9. [ ] Profiles can be explicitly deleted
10. [ ] Unused profiles expire after 1 year
11. [ ] Contamination causes hard reject during enrollment
12. [ ] Contamination causes warning or reject at runtime (mode-dependent)

---

## Implementation Phases

### Phase 1: Core Protocol

* Consent screen
* Preflight checks
* Multi-take capture with quality rejection
* Profile build
* Basic verification

### Phase 2: Calibration and Policy

* AS-Norm score normalization
* Mode-aware thresholds
* Step-up model integration

### Phase 3: Hardening

* PAD/liveness integration
* Retention policy enforcement
* Spoof detection
* Audit logging
