# UI Spec: Profiles Control Plane (Deep Settings)

## Purpose
This document provides the exhaustive UI and data-model specification for the **Profiles Page**. This is the high-integrity administrative surface where long-term human and agent identities are managed. It is distinct from the "Participants Popup" which handles live session state.

## 1. Global Layout
*   **Navigation Path:** `Settings > Profiles`
*   **Header:** Summary statistics (Total Humans, Total Agents, Active Session Owner).
*   **View Toggle:** A prominent "Humans" vs. "Agents" toggle or tab set. 
    *   *Constraint:* These two classes must never be mixed in a single list.

---

## 2. Human Profile Management (Tab A)

### The Profile Card
Each human is represented by a "Profile Card" with the following data sections:

#### A. Header (Identification)
*   `avatar`: High-contrast visual identifier.
*   `displayName`: User-defined string.
*   `profileId`: Immutable system UUID.
*   `policyTierBadge`: Visual indicator (e.g., Blue for Personal, Purple for Admin).
*   `lifecycleStatus`: Badge showing `ACTIVE`, `SUSPENDED`, or `REVOKED`.

#### B. Readiness Indicators (The "Checklist")
A vertical or horizontal list of status icons representing the profile's legal ability to operate:
*   `Passkey Status`: (Icon: Key) — Green/Check if registered, Gray/X if missing.
*   `PIN Status`: (Icon: Dialpad) — Green/Check if set, Gray/X if missing.
*   `Voice Status`: (Icon: Waveform) — Green/Check if enrolled, Gray/X if missing.
*   `Recovery Status`: (Icon: Shield) — Green/Check if TOTP enabled.

#### C. Operational Metrics
*   `lastRootAuth`: Human-readable timestamp (e.g., "Oct 22, 2024 - 14:30").
*   `activeTrustWindow`: Remaining time in the current session (if joined).
*   `inactivityTimeout`: Display of the current policy-assigned limit (e.g., "15 min").

---

## 3. The "Manage Security" Drawer
*Logic: High-risk security settings are hidden behind a secondary action to prevent accidental clicks or "convenience" bypasses.*

When a user clicks **Manage Security** on a human profile card, a side-drawer opens. It contains:

### Section 1: Root Factors (Passkeys)
*   `List of Registered Passkeys`: Shows device name and registration date.
*   `Button: Register New Passkey`: Triggers the platform WebAuthn flow.
*   `Button: Rotate/Replace Passkey`: **High-Risk Action.** Requires a Fresh Passkey challenge from the *current* valid passkey before adding a new one.

### Section 2: Continuity Factors (PIN)
*   `Status`: "PIN is active/configured."
*   `Button: Reset PIN`: **High-Risk Action.** Requires a Fresh Passkey challenge.
*   *Rule:* A user cannot reset their PIN using only their existing PIN.

### Section 3: Policy & Recovery
*   `Policy Tier Selector`: (e.g., Standard vs. High-Assurance).
*   `Toggle: Enable Recovery Path`: Activates TOTP setup.
*   `Timeout Slider`: Adjusts the inactivity-to-stale window (within policy-defined min/max limits).

---

## 4. Agent Identity Management (Tab B)

### The Agent Card
Agents are system principals and are visually distinct (e.g., square avatars, mono-spaced font for IDs).

#### A. Identity & Persona
*   `agentName`: System name.
*   `workloadId`: Cryptographic identifier (SPIFFE/UUID).
*   `personaLabel`: The assigned TTS voice name (e.g., "Nova-Persona-Alpha").
*   `personaSample`: A small "play" button to hear the agent's current persona.

#### B. Capabilities & Scope
*   `AuthScopeBadge`: List of allowed systems (e.g., `FS_READ`, `BROWSER_CONTROL`).
*   `SignatureStatus`: Shows if the agent’s binary/script is currently signed and verified.

---

## 5. Mutation & Audit UX Patterns

### The "Security Step-Up" Modal
Whenever a user attempts a **Security Mutation** (e.g., resetting a PIN), the UI must:
1.  Dim the background.
2.  Display a modal: **"Security Mutation Requested."**
3.  Message: *"This action requires a Fresh Passkey authentication. Please use your platform authenticator (TouchID, FaceID, or Security Key)."*
4.  Show a "Cancel" and "Proceed to Passkey" button.

### The Audit Receipt
Immediately following a successful mutation, a transient notification or a new entry in the **Security Log** section appears:
*   `Event`: PIN Reset
*   `Principal`: Mike (Admin)
*   `Factor Used`: Passkey (Hardware Key)
*   `Result`: Success
*   `Reason Code`: `user_requested_rotation`

## 6. Prohibited Elements (The "No" List)
*   **NO** "Choose Authenticator" dropdowns (Maestro lets the OS/Browser decide).
*   **NO** "Password" fields (Passwords are not a factor in Maestro).
*   **NO** "Reset via Email" (Bypasses root trust; recovery must use the TOTP path).
*   **NO** Agent "Join Room" button (Agents don't join human rooms).