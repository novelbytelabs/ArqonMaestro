# Arqon Maestro Multi-User Room Architecture

## Purpose
This document defines how Arqon Maestro supports multiple authenticated humans in a single shared physical environment, running on a single Electron session, without creating a "passkey trainwreck" or spamming users for PINs on every command.

It is the canonical engineering specification for how the Maestro runtime manages identity, session isolation, and command attribution during live collaboration.

## 1. Operating Modes

### Single-User Mode (Default)
*   **Startup:** Defaults to a Passkey-first startup. 
*   **Mapping:** The WebAuthn assertion maps directly to a single human profile.
*   **State:** That single active human profile owns the entire session. The Participants Popup is hidden or disabled.
*   **Execution:** Voice verification ensures the seated user matches the profile, but cross-speaker attribution is unnecessary.

### Multi-User Room Mode (Collaborative Workspace)
*   **Startup:** The "Session Sponsor" (first user) boots the room via a Passkey challenge.
*   **State:** The Room is created. The Participants Popup unlocks.
*   **Joining:** Other humans join the live room by selecting their profile from the Popup and authenticating with their own personal Passkeys.
*   **Execution:** Spoken commands are attributed to specific joined humans via live voice diarization and verified against their personal Trust Windows.

---

## 2. Multi-User Room Laws

1.  **Session Host Law:** In multi-user mode, one human boots the room session, but room participation does not automatically grant command authority to others in the physical room.
2.  **Participant Join Law:** A human may become an authenticated participant in the active room roster *only* by successfully authenticating with their own passkey. 
3.  **Speaker-to-Principal Law:** An executable command may only be attributed to a currently joined, authenticated participant whose live voice matches the profile, and whose current factor state satisfies the command's risk level.
4.  **No Borrowed Trust Law:** One participant’s passkey authentication, PIN freshness, or active state NEVER grants another participant executable authority. Trust is strictly personal, even in a shared room.
5.  **Agent Exclusion Law:** Agents do not join the room via the Participants roster. They possess cryptographic identities and do not participate in human session sharing.

---

## 3. The Participant Trust Window

To prevent PIN spam on every command during a collaborative session, Maestro uses individual **Trust Windows**. Trust is established by Passkey, maintained by activity, and refreshed by PIN.

### Participant Trust States

1.  **VISIBLE:** In the available profiles list, but not authenticated in this room.
2.  **JOINED:** Passkey-authenticated into the active roster.
3.  **ACTIVE:** Joined and currently usable for Operational/Guarded commands (Voice is sufficient).
4.  **STALE:** Joined, but inactive beyond their policy limits. Needs a quick PIN unlock to restore the Active state.
5.  **LOCKED:** Temporarily blocked from executing (manual or system-triggered).
6.  **EXPIRED:** Root trust lost. Must rejoin the room with a fresh Passkey.

### Participant Roster Data Model
The runtime maintains a live array of participants. Each participant record must track:

```typescript
interface RoomParticipant {
  profileId: string;
  displayName: string;
  policyTier: "personal" | "developer" | "enterprise" | "admin";
  roomState: "joined" | "active" | "stale" | "locked" | "expired";
  passkeyJoinedAt: number; // Timestamp
  pinUnlockedAt: number;   // Timestamp
  voiceVerifiedAt: number; // Timestamp
  lastActiveAt: number;    // Timestamp
  trustWindowValidUntil: number; // Timestamp based on tier timeout
}
```

---

## 4. Multi-User Risk Routing Matrix

When a command is spoken, the orchestrator evaluates the Risk Bucket against the *specific speaker's* Trust Window.

### 1. Reflex / Exempt (e.g., "Stop")
*   **Requirement:** Audio command recognized.
*   **Action:** Immediate execution. Voice verification is bypassed for speed and safety.

### 2. Low Risk (Navigational / Read-only)
*   **Requirement:** Speaker is JOINED + Live Voice verified.
*   **Action:** Execute. (Allows execution even if the user is STALE, provided they are in the room roster).

### 3. Operational Risk (Normal workflow, editing, tools)
*   **Requirement:** Speaker is ACTIVE + Live Voice verified.
*   **Action:** Execute immediately.
*   **Fallback:** If speaker is STALE, the command is suspended. The user is prompted for their PIN. Upon success, the window refreshes to ACTIVE and the command executes.

### 4. Guarded Risk (Commits, external submissions)
*   **Requirement:** Speaker is ACTIVE + Live Voice verified.
*   **Action:** Execute immediately.
*   **Fallback:** If speaker is STALE, prompt for PIN. *(Note: Policy settings may allow admins to configure Guarded actions to always require a fresh PIN, regardless of window state).*

### 5. High Risk (Irreversible actions, security boundaries)
*   **Requirement:** Speaker is JOINED + Live Voice + **Fresh Passkey Challenge**.
*   **Action:** Suspend command, prompt for Passkey regardless of ACTIVE/STALE state. A PIN cannot satisfy this requirement.

### 6. Security Mutation (Resetting PIN, changing recovery)
*   **Requirement:** **Fresh Passkey Only**.
*   **Action:** Suspend, prompt Passkey. Voice and PIN cannot satisfy this.

---

## 5. Trust Window Degradation Rules

A participant's Trust Window automatically degrades from **ACTIVE to STALE** (or LOCKED) when:

1.  The configured inactivity timeout is reached (e.g., 15 minutes of silence).
2.  The user switches to a different physical audio input device.
3.  The system detects a severe context jump (e.g., network IP change, desktop screen lock).
4.  Another user explicitly executes a High-Risk command in the shared room (optional strict-isolation policy).
5.  Diarization detects a continuous unknown speaker attempting to issue commands for an extended period.

---

## 6. Implementation Notes for the Shared Session

Even though there is only one visible Electron session, Maestro must logically isolate the human runtime trust state:
*   The single Factor Orchestrator must hold separate continuity and factor freshness state per human.
*   Commands are evaluated strictly against the speaking human's policy tier and trust window.
*   If true persistent partition separation is required for private workspaces (e.g., private browser sessions), Maestro must utilize Electron's `persist:human:<profile-id>` partitions, while keeping the Voice operating layer unified above them.