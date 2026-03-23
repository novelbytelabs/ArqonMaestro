# Arqon Maestro Identity & Participants UI Spec

## Purpose
This document defines the canonical engineering specifications for the two primary identity control surfaces in Arqon Maestro:
1.  **The Profiles Page:** The deep, administrative control plane for long-term human and agent identities.
2.  **The Participants Popup:** The lightweight, floating live-roster modal used for room collaboration and quick authentication.

It enforces the visual separation of humans and agents, and prevents dangerous security mutations from bleeding into casual UI actions.

---

## Surface 1: The Profiles Page (Identity Control Plane)

**Core Law:** Human profiles and Agent identities must never be visually conflated. They must exist in physically distinct sections or tabs.

### Tab A: Human Profiles

The Human Profiles tab is a list of cards representing operators who can authenticate into the system.

#### 1. Identity Summary (Header)
*   **Avatar & Display Name**
*   **Profile ID**
*   **Role / Policy Tier Badge:** (e.g., `Personal`, `Developer`, `Enterprise`, `Admin`)
*   **Lifecycle Status:** 🟢 `Active` | 🟡 `Suspended` | 🔴 `Revoked`

#### 2. Security Readiness Block
This is crucial for first-run setup and onboarding. Users must immediately see if a profile is legally allowed to operate Maestro.
*   **Passkey:** `Ready` / `Missing`
*   **Local PIN:** `Ready` / `Missing`
*   **Voice Enrollment:** `Enrolled` / `Missing`
*   **Recovery Path:** `Enabled` / `Disabled`

#### 3. Audit Summary (Footer)
*   **Last Root Auth:** (e.g., "2 hours ago")
*   **Last Voice Verification:** (e.g., "Current Session" or "3 days ago")
*   **Last Security Event:** (e.g., "Passkey Rotated - Oct 12")

#### 4. Human Profile Actions
*   **Primary Action: `Manage Security`** 
    *   *Rule:* Do NOT place security mutations (like "Change PIN") directly in the row action strip.
    *   Clicking this opens a dedicated drawer/modal containing: 
        *   Register Passkey
        *   Rotate/Reset Passkey (Requires Fresh Passkey challenge)
        *   Set/Reset Local PIN
        *   Enable/Disable Recovery
        *   Change Inactivity Timeout (Policy permitting)
*   **Secondary Actions:** `Re-enroll Voice`, `View Details`
*   **Danger Actions (Visually separated/red):** `Suspend`, `Revoke`, `Delete`

---

### Tab B: Agent Identities

The Agent Identities tab is a list of cryptographic workloads that operate within the Arqon ecosystem.

#### 1. Identity Summary (Header)
*   **Avatar & Agent Name**
*   **Agent ID**
*   **Role / Class Badge:** (e.g., `Linter`, `Workflow Runner`)
*   **Lifecycle Status:** 🟢 `Active` | 🟡 `Suspended` | 🔴 `Revoked`

#### 2. Technical & Authorization Block
*   **Workload Identity Health:** `Valid` / `Expired`
*   **Credential Health:** `Signed` / `Revoked`
*   **Voice Persona:** Assigned TTS voice (Must be explicitly labeled as a "Persona," never an "Auth Factor").
*   **Authorization Scope:** Read/Write boundaries.

#### 3. Agent Actions
*   `View Identity Details`
*   `Rotate Credentials`
*   `Suspend`, `Revoke`, `Delete`
*   `View Execution Audit`

---

## Surface 2: The Participants Popup (Live Room Roster)

**Purpose:** A floating modal accessible globally within the single Electron session. It replaces the need to navigate to the deep Profiles page just to log in, unlock a PIN, or see who is currently active in a collaborative room.

### Section A: Room Participants (The Active Roster)
This section lists humans who currently hold a Trust Window in the live session.

#### 1. Row Data
*   **Avatar & Display Name**
*   **Policy Tier Badge**
*   **Live Status Indicator:** 
    *   🟢 `Active` (Ready for Operational/Guarded commands)
    *   🟡 `Stale` (Needs PIN to execute Guarded commands)
    *   🔴 `Locked` (Paused/Suspended)
*   **Last Activity String:** (e.g., "Spoke 1m ago")

#### 2. Row Actions (Hover / Context Menu)
*   `Unlock Me` (Triggers a PIN prompt to move the user from STALE back to ACTIVE)
*   `Lock Session` (Manually drops status to LOCKED)
*   `Leave Room` (Drops root trust, removes the user from the Active Roster, and moves them back to Available Profiles)

---

### Section B: Available Profiles
This section lists human profiles that exist on the machine (or are allowed by the Session Sponsor) but are *not* currently authenticated in the room.

#### 1. Row Data
*   **Avatar & Display Name**
*   **Readiness State:** (e.g., "Passkey Ready" or "Setup Required")

#### 2. Row Actions
*   **Primary Action: `Join Room`**
    *   *Rule:* Triggers a profile-targeted Passkey challenge. Upon successful cryptographic assertion, the user is moved up into the Room Participants (Active Roster).

---

## UI Constraints & Security Gotchas

1.  **No Provider Toggles:** Neither the Profiles Page nor the Participants Popup will contain "Choose Apple/Google/Windows" toggles. Provider routing is entirely platform-native via standard WebAuthn APIs. Do not leak vendor selection into the Maestro user interface.
2.  **No Proxy Auth (The "Sponsor" Rule):** The Session Sponsor (the first user who booted the room) can view the Available Profiles list, but they *cannot* click "Join Room" to authenticate another user. The passkey challenge must be completed locally by the target human.
3.  **Active Disambiguation:** The UI must never use the word "Active" loosely. It must clearly distinguish visually between *Lifecycle Active* (The profile exists and is not revoked) and *Trust Window Active* (The user is in the room and currently unlocked).
4.  **Floating Context:** The Participants Popup must be dismissible without losing the room state. The roster and trust windows live in the runtime memory of the Factor Orchestrator, not tied to the UI component's rendering lifecycle.
5.  **No Agent Clutter:** Agents do NOT appear in the Participants Popup. Agents do not "log in" alongside humans in a shared physical room.