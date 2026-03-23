# Arqon Maestro: Trust Window Lifecycle

## Purpose
This document defines the technical state machine and timing logic for a human participant’s "Trust Window" within an active Maestro Room. It specifies how the runtime manages operational readiness, handles idle timeouts, and triggers re-authentication (PIN/Passkey) to maintain security without interrupting fluid workflows.

## 1. The Trust Window Concept
A **Trust Window** is a temporary, policy-gated authorization state assigned to a specific human profile after they have established Root Trust (Passkey) in a Room. 

The goal of the Trust Window is to allow **Operational** and **Guarded** commands to execute via Live Voice alone for a set duration, moving the requirement for secondary factors (PIN) to the "edges" of the session rather than every command.

---

## 2. Participant State Machine

Each human in the Participants Roster exists in exactly one of the following states:

| State | Definition | Authorization Level |
| :--- | :--- | :--- |
| **VISIBLE** | Profile is known but not in the Room. | None. |
| **JOINED** | Passkey authenticated. Entry state. | Root Trust established. |
| **ACTIVE** | Operational readiness window is open. | `Low`, `Operational`, and `Guarded` risk actions allowed via Voice. |
| **STALE** | Window has idled out. | `Low` risk only. `Operational/Guarded` require PIN to refresh. |
| **LOCKED** | Explicitly paused or anomaly detected. | `Reflex` only. Requires PIN or Passkey to unlock. |
| **EXPIRED** | Session has timed out or been revoked. | None. Must rejoin via Passkey. |

---

## 3. State Transitions & Triggers

### T-01: VISIBLE → JOINED (Room Entry)
*   **Trigger:** Successful Passkey (WebAuthn) assertion from the Participants Popup.
*   **Effect:** `passkeyJoinedAt` timestamp updated. State becomes `JOINED`.
*   **Immediate Next State:** Automatically transitions to `ACTIVE`.

### T-02: ACTIVE → STALE (Idle Degradation)
*   **Trigger:** `CurrentTime - lastActiveAt > policyInactivityTimeout`.
*   **Effect:** The "Trust Window" closes. Commands in the `Operational` or `Guarded` buckets will now trigger a PIN challenge.
*   **Purpose:** Ensures that if a user leaves the room, their profile cannot be used by a passerby using only a voice recording or imitation.

### T-03: STALE → ACTIVE (Window Refresh)
*   **Trigger:** Successful PIN entry (Continuity Factor).
*   **Effect:** `pinUnlockedAt` updated. `lastActiveAt` reset to `now`. Window is restored.

### T-04: ACTIVE/STALE → LOCKED (Safety/Manual)
*   **Trigger:** 
    *   Manual "Lock Me" action in the Participants Popup.
    *   Diarization detects a prolonged Unknown Speaker.
    *   OS-level "Lock Workstation" event.
*   **Effect:** All non-reflex commands are blocked.

### T-05: ANY → EXPIRED (Session End)
*   **Trigger:** 
    *   Explicit "Leave Room" action.
    *   Extreme inactivity (e.g., 8 hours).
    *   Security Mutation (e.g., Passkey changed on another device).
*   **Effect:** Profile is removed from the Active Roster.

---

## 4. Policy-Based Timing (The "Grace Period")

The length of the `ACTIVE` window is determined by the profile’s **Policy Tier**.

| Policy Tier | Active Window (Default) | Inactivity to Stale |
| :--- | :--- | :--- |
| **Personal** | 30 Minutes | High tolerance. |
| **Developer** | 15 Minutes | Balanced for productivity. |
| **Enterprise** | 10 Minutes | Strict compliance. |
| **Admin** | 5 Minutes | High-sensitivity; frequent re-check. |

---

## 5. Diarization & Voice Verification Integration

The Trust Window is only valid if the **Live Speaker Law** is satisfied.

1.  **Voice Match:** On every command, the voice engine must return a high-confidence match for the profile associated with the Trust Window.
2.  **Attribution:** If Person A is `ACTIVE` but Person B speaks, the command is **Blocked** (Unknown Speaker Law) or evaluated against Person B’s own window (if they are also in the room).
3.  **Window Update:** Every successful `ACTIVE` command execution resets the `lastActiveAt` timestamp, effectively pushing the "Stale" transition further into the future.

---

## 6. Security Gotchas

*   **Gotcha: Window Hijacking.** If the timeout is too long, an unauthorized person could speak a command immediately after the authorized user leaves.
    *   *Countermeasure:* The `lastActiveAt` reset only occurs on *verified* voice matches. Background noise or unverified speech does not keep the window open.
*   **Gotcha: The "PIN Loop".** If a command is high-risk, the user might think a PIN is enough because they are "Stale."
    *   *Countermeasure:* The **No Substitution Law** takes precedence. High-Risk actions always demand a Passkey, even if the user just entered their PIN.
*   **Gotcha: Ghost Participants.** A user stays "Joined" in a room for days.
    *   *Countermeasure:* Force `EXPIRED` state on all participants when the Session Sponsor leaves or the Room is closed.