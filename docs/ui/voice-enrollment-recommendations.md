# Voice Enrollment Recommendations

## Core Problem

The current Security page acts like an operations/debug console for voice trust, not a real enrollment workflow. It shows status, security modes, profile names, and buttons like RE-ENROLL / TEST VERIFICATION / RESET ENROLLMENT, but it does not define how enrollment audio is captured, how much clean speech is required, when a take is rejected, or when a profile is actually ready for trusted use.

This makes enrollment feel like a button-click process rather than a biometric protocol.

---

## What Common Practice Shows

Serious voice enrollment systems separate these stages:

consent → preflight quality checks → guided capture → per-take acceptance/rejection → profile creation/training → post-enrollment verification → profile hardening/refresh → expiry/opt-out

Azure explicitly models `Enrolling`, `Training`, and `Enrolled`, tracks accepted enrollments and pure speech after silence removal, and exposes how much speech is still needed.

AWS Voice ID defines concrete thresholds: **30 seconds of net speech for enrollment** and **10 seconds for verification**.

AWS also distinguishes **active** voice biometrics (specific phrases) from **passive** (any speech once enough audio is available). Azure's first enrollment requires a predefined activation phrase.

---

## Recommendations

### 1. Consent First

Before any capture, the user must explicitly consent to voice biometric enrollment, see what is stored, how to delete it, and what authority voice alone does or does not grant.

For Maestro:

* explicit opt-in
* explicit delete/unenroll
* encrypted template storage
* opaque profile IDs (not PII as canonical key)

### 2. Preflight Before Capture

Do not let users enroll until the environment is acceptable.

Minimum preflight checks:

* microphone exists and is stable
* no clipping present
* signal level is healthy
* background noise is acceptable
* only one speaker is active
* overlap is absent
* audio pipeline is in expected format (16 kHz mono PCM)

Contamination should become:

* **hard fail for enrollment takes**
* **soft or hard caution for runtime verification**

### 3. Guided Multi-Take Capture

A strong v1 protocol:

* capture 4 to 6 accepted takes
* each take 6 to 10 seconds
* target **30 seconds of net accepted speech**
* mix prompted speech and free speech
* require fresh speech for post-enrollment verification

### 4. Per-Take Verdicts

Every take should end in one explicit result:

* accepted
* too short
* too little pure speech
* clipping detected
* low SNR
* overlap detected
* multiple speakers suspected
* silence-heavy
* device changed mid-capture
* spoof suspected

### 5. Real Profile Lifecycle States

Instead of Not Enrolled / Enrolled / Re-enroll / Reset, use:

`NotEnrolled → ConsentRequired → PreflightReady → Capturing → TakeRejected/TakeAccepted → Enrolling → Training → MinimumProfileReady → Verified → Hardened → Stale → ReenrollmentRecommended → Expired → OptedOut`

### 6. Post-Enrollment Verification Gate

* profile becomes `MinimumProfileReady` after minimum accepted speech
* profile becomes `Verified` only after a fresh verification pass with different speech
* profile becomes `Hardened` after additional accepted speech across later sessions

### 7. Active and Passive Voice Design

* **Passive voice** for normal day-to-day continuity and low-friction ownership evidence
* **Prompted phrase** for first-time enrollment, recovery, or step-up verification in stricter modes
* **Fresh voice + other factor** for the highest-risk actions

### 8. Threshold Calibration

Do not use one magic number like "if similarity > 0.82, allow."

Instead:

raw similarity → normalized score → calibrated policy score → mode-aware policy decision

Apply different boundaries by mode:

* Normal
* Shared Room
* Secure
* Restricted

Shared Room should penalize contamination and freshness harder. Restricted should require step-up even when voice matches strongly.

### 9. Retention and Freshness

* local verification cache expires quickly
* trusted freshness decays over hours, not weeks
* long-unused profiles expire automatically
* every profile supports explicit unenroll/delete

---

## UI Split

### A. Enrollment Wizard

Screen 1: Consent
Screen 2: Microphone and room preflight
Screen 3: Guided capture with take-by-take progress
Screen 4: Profile creation/training
Screen 5: Verify now
Screen 6: Completion and policy explanation

### B. Security / Identity Console

Reposition current tab as runtime observability panel showing:

* current profile state
* last verification freshness
* contamination/overlap status
* device trust
* last decision reason
* provider health
* confidence bucket
* reenrollment recommendation

---

## Acceptance Criteria

* Enrollment cannot complete without explicit consent
* Enrollment cannot complete if overlap/multi-speaker contamination is detected
* Enrollment shows accepted speech accumulated, not just "success/failure"
* Enrollment distinguishes `Enrolling`, `Training`, and `Enrolled/Verified`
* Verification uses fresh speech and is separate from enrollment
* System stores profiles under opaque IDs and encrypts biometric material
* Thresholds are calibrated per policy mode, not hardcoded globally
* High-risk actions do not rely on voice alone
* Profiles can expire, be deleted, and be reenrolled cleanly
