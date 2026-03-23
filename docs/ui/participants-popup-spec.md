# UI Spec: Participants Popup (Live Roster)

## Purpose
This document provides the exhaustive UI specification for the **Participants Popup**. Unlike the deep administrative Profiles Page, the Popup is a lightweight, floating modal accessible globally within the Maestro session. It is the primary interface for live room collaboration, allowing participants to join, monitor their trust status, and perform quick PIN-unlocks without leaving their active workflow.

## 1. Global UI Behavior
*   **Accessibility:** Triggered via a global hotkey, a system tray icon, or a dedicated "Participants" button in the Maestro HUD.
*   **Context:** Floating/Overlay. Does not interrupt the active Electron session.
*   **Persistence:** The popup is transient (dismissible), but the data it represents (the Roster) is persistent in the Factor Orchestrator runtime memory.
*   **One-Session Rule:** The popup represents the state of the *single* active Maestro Room.

---

## 2. Structural Layout
The popup is vertically divided into two distinct panels:

### Panel 1: Room Participants (The Active Roster)
*   **Header:** "Room Participants" with a count (e.g., `3 Joined`).
*   **Content:** A scrollable list of humans currently authenticated in the room.

#### Individual Participant Row
Each row represents a joined human and must display:
1.  **Avatar & Display Name:** Circular avatar with the profile's name.
2.  **Role/Tier Badge:** Small tag (e.g., `ADM`, `DEV`, `ENT`).
3.  **Trust State Indicator:** A prominent color-coded status icon:
    *   🟢 **Active:** (Pulsing green) Ready for all operational commands.
    *   🟡 **Stale:** (Solid yellow) Idle timeout reached. Needs PIN for next guarded action.
    *   🔴 **Locked:** (Solid red) Explicitly paused. Requires PIN/Passkey to resume.
4.  **Activity Snippet:** Micro-text showing `Last active: 2m ago`.

#### Participant Context Actions (Hover/Right-Click)
*   `Unlock / Refresh`: (Visible only if Stale/Locked). Triggers a PIN prompt to restore the Trust Window.
*   `Lock Profile`: Drops the user's state to LOCKED immediately.
*   `Leave Room`: Terminates the user's session and moves them back to the "Available" panel.

---

### Panel 2: Available Profiles (The Invitation List)
*   **Header:** "Available Profiles" with a count.
*   **Content:** A list of human profiles known to the system but not currently in the room.

#### Available Profile Row
1.  **Avatar & Display Name.**
2.  **Readiness Badge:** (e.g., `Ready` or `Setup Needed`).
3.  **Primary Action: `Join Room`**
    *   *Logic:* Clicking this invokes a targeted Passkey (WebAuthn) challenge for that specific profile. 
    *   *Success:* The profile moves from Panel 2 to Panel 1.

---

## 3. The "Quick Unlock" Interaction Pattern
To minimize friction while maintaining the **Risk and Factor Law**, the popup handles PIN prompts inline:

1.  **Trigger:** User speaks an Operational command while their status is 🟡 `Stale`.
2.  **Maestro Response:** The Participants Popup automatically slides into view (if hidden) and focuses on that user's row.
3.  **Prompt:** A small, 4-6 digit PIN entry field appears directly within the participant's row.
4.  **Input:** User enters their local device-bound PIN.
5.  **Resolution:** On success, the status icon flips to 🟢 `Active`, the popup fades, and the suspended command executes.

---

## 4. Multi-User Collaboration HUD (Optional Overlay)
For high-collaboration environments, a "Mini-Roster" can be pinned to a corner of the screen:
*   **Content:** Only the status icons (dots) and avatars of joined participants.
*   **Purpose:** Allows everyone in the room to see at a glance if they are currently `Active` or if they need to `Unlock` before their next command.

---

## 5. Security Constraints (The "Don'ts")
1.  **DON'T** show Agents in this popup. Agents are not "participants" in a physical room; they are system-level workloads.
2.  **DON'T** allow one user to click "Unlock" for another user. The system must verify the speaker's voice matches the profile being unlocked.
3.  **DON'T** allow Passkey registration from this popup. New passkeys must be registered in the deep **Profiles Control Plane** to ensure the user is in a "high-integrity" state.
4.  **DON'T** show sensitive audit logs here. Keep the popup focused strictly on *Presence* and *Trust State*.

---

## 6. Technical Implementation Note
The Participants Popup should be implemented as a separate Electron BrowserWindow or a high-level UI component that communicates with the **Factor Orchestrator** via IPC. It must remain responsive even if the main application is performing heavy background tasks.