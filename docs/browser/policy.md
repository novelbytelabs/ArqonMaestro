# 🛡️ Interaction Policy

Maestro uses a multi-layered **Interaction Policy** to ensure that voice control is both powerful and safe. Policy determines what the system is allowed to do based on the current domain, the command risk, and the speaker's identity.

---

## 🏗️ Policy Layers

### 1. Domain-Based Policy
Maestro automatically categorizes domains to set a baseline safety posture.

- **Trusted Domains**: (e.g., standard documentation, search engines). Default to **PILOT** mode.
- **Sensitive Domains**: (e.g., AWS Console, Internal Admin). Default to **ASSIST** mode.
- **Restricted Domains**: (e.g., Bank logins, payment gateways). Default to **LOCKED** mode.

### 2. Command-Based Policy
Individual commands are calibrated based on their potential for destruction or data mutation.

- **Low-Risk**: Navigation (`back`, `next tab`), Inspection (`show links`). Usually run without verification.
- **Medium-Risk**: Navigation with side effects (`reload`, `go to site`). May require verification on sensitive domains.
- **High-Risk**: Mutation (`click`, `submit`, `type code`). Strongly gated by both domain policy and speaker identity.

---

## 🧩 Policy and Automation Modes

The **Effective Mode** you see in the Operator Deck is the real-time result of these policy layers.

| State | Resulting Mode |
| :--- | :--- |
| **Verified Voice + Trusted Domain** | **PILOT** (Full Authority) |
| **Unknown Voice + Trusted Domain** | **PILOT** (Standard Authority) |
| **Verified Voice + Sensitive Domain** | **PILOT** (Elevated Authority) |
| **Unknown Voice + Sensitive Domain** | **ASSIST** (Read-Only) |
| **Any Voice + Restricted Domain** | **LOCKED** (No Automation) |

---

## ⚙️ Customizing Policy

You can manage your domain-specific overrides in the **Ecosystem Configuration**. 

- **Always Pilot**: Force a domain into Pilot mode (not recommended for sensitive sites).
- **Strict Mode**: Force 2FA or explicit confirmation for every mutation, regardless of identity confidence.
- **Deny-List**: Completely block Maestro from interacting with specific sites or internal TLDs.

> [!TIP]
> Use the **Policy Preview** panel in the Operator Surface to see why a specific mode is currently active for your current tab.
