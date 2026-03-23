# Arqon Maestro Risk and Factor Law

## Purpose
This document is the canonical engineering specification for how the Arqon Maestro Factor Orchestrator evaluates spoken intents against human trust factors. It defines the exact logic for when the system allows immediate execution, when it prompts for a PIN, and when it demands a fresh Passkey.

## 1. The Core Maxims
These laws govern the authorization router and cannot be overridden by user preference or UI toggles.

1.  **Root Trust Law:** Passkey (WebAuthn/FIDO2) is the sole mechanism for establishing session ownership (Joining the Room) and authorizing High-Risk boundaries.
2.  **Continuity Law:** The local, device-bound PIN is used strictly to refresh a Stale Trust Window. It never establishes Root Trust and never satisfies a High-Risk challenge.
3.  **Live Speaker Law:** Every executable command (excluding Reflexes) requires successful live voice verification matching the authenticated profile.
4.  **No Substitution Law:** A weaker factor (e.g., Voice + PIN) cannot satisfy a stronger requirement (e.g., Passkey).
5.  **Agent Boundary Law:** Agents do not possess Voice or Passkey factors. They authenticate via cryptographic workload identity only.
6.  **Fail-Closed Law:** If the speaker's identity is unknown, or their trust state is degraded/uncertain, the command is hard-blocked.

---

## 2. Factor Hierarchy & Requirements

| Factor | Primary Role | Implementation Constraint |
| :--- | :--- | :--- |
| **Passkey** | Root Trust & Security Boundaries | Required for Room Join, High-Risk actions, and Security Mutations. |
| **PIN** | Continuity / Refresh | Required to transition a profile from STALE back to ACTIVE. |
| **Voice** | Live Command Attribution | Required per-command to prove *who* is currently speaking. |
| **TOTP** | Recovery Path Only | Never used for normal operational step-ups or room entry. |

---

## 3. The Risk Buckets

Maestro categorizes all intents into specific risk buckets. The Factor Orchestrator evaluates the Command Risk against the Speaker's current **Trust Window** (Active vs. Stale).

### Bucket 0: Reflex (Exempt)
*   **Definition:** Safety-critical, system-level halts. (e.g., "Stop", "Cancel", "Pause").
*   **Requirement:** Audio command recognized.
*   **Execution:** Immediate. Voice verification is bypassed for maximum responsiveness.

### Bucket 1: Low Risk (Navigational)
*   **Definition:** Read-only, harmless, or lightweight navigational actions. (e.g., "Scroll down", "What time is it?", "Show my calendar").
*   **Requirement:** Speaker is a JOINED participant + Live Voice matches.
*   **Execution:** Executes immediately even if the user's Trust Window is STALE, provided they are authenticated in the room.

### Bucket 2: Operational Risk (Productivity)
*   **Definition:** Normal daily work. Coding, browser navigation, tool usage, routine edits.
*   **Requirement:** Speaker is ACTIVE + Live Voice matches.
*   **Execution:** Executes immediately. **No PIN spam.**
*   **Failure Path:** If the speaker is STALE, the command is suspended. Maestro prompts for a PIN. Upon success, the window refreshes to ACTIVE and the command resumes.

### Bucket 3: Guarded Risk (Consequential)
*   **Definition:** Actions with external side-effects or meaningful state changes. (e.g., `git push`, submitting a form, deleting a local file).
*   **Requirement:** Speaker is ACTIVE + Live Voice matches.
*   **Execution:** Executes immediately if the window is ACTIVE.
*   **Note:** Enterprise policies may configure Guarded actions to always require a fresh PIN challenge regardless of window state.

### Bucket 4: High Risk (Irreversible)
*   **Definition:** Severe, unrecoverable actions or crossing major security boundaries. (e.g., Deleting a repository, executing a production deployment, financial transfers).
*   **Requirement:** Speaker is JOINED + Live Voice matches + **Fresh Passkey Challenge**.
*   **Execution:** Suspends command and invokes the platform Passkey prompt. A PIN is never sufficient.

### Bucket 5: Security Mutation (Policy/Factor Changes)
*   **Definition:** Changing the security logic of the profile itself. (e.g., Adding a Passkey, resetting a PIN, changing Policy Tier).
*   **Requirement:** **Fresh Passkey Only**.
*   **Execution:** Voice verification is bypassed. If the user cannot provide a Passkey, they must enter the heavily audited Recovery Path.

---

## 4. The Authorization Truth Table

| Risk Level | Speaker Trust State | Action Taken by Factor Orchestrator |
| :--- | :--- | :--- |
| **Any (except Reflex)** | Not in Roster (Unknown) | `HARD BLOCK` |
| **Low** | JOINED (Active or Stale) | `EXECUTE` |
| **Low** | EXPIRED / LOCKED | `BLOCK` (Prompt Join Room) |
| **Operational / Guarded**| ACTIVE | `EXECUTE` |
| **Operational / Guarded**| STALE | `SUSPEND` -> Prompt PIN -> `RESUME` |
| **High Risk** | JOINED | `SUSPEND` -> Prompt Passkey -> `RESUME` |
| **Security Mutation** | Any | `SUSPEND` -> Prompt Passkey |

---

## 5. Trust Window Degradation Rules

The Factor Orchestrator must automatically degrade a participant's Trust Window from **ACTIVE to STALE** (or LOCKED) when:

1.  **Inactivity Timeout:** The user has not issued a command within their policy-allotted time (e.g., 15 minutes).
2.  **Speaker Change:** Diarization detects a different human has taken the "floor" for an extended period.
3.  **Environment Shift:** The system detects a change in physical audio hardware or a network IP jump.
4.  **System Lock:** The host OS enters a sleep or lock state.
5.  **Session Transition:** A different human in the room executes a High-Risk command (triggering a global "re-verify" for others, if configured by policy).

## 6. Audit & Evidence Contract

Every decision made by the Factor Orchestrator against these buckets must produce a signed Evidence Record:
*   `timestamp`
*   `intentName`
*   `riskBucket`
*   `speakerProfileId`
*   `trustStateAtTime` (Active/Stale)
*   `factorsChallenged` (None/PIN/Passkey)
*   `outcome` (Allowed/Blocked/Canceled)
*   `reasonCode` (e.g., `passkey_freshness_expired`)