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

- **Low-Risk**: Navigation and non-mutating inspection.
- **Medium-Risk**: Commands with side effects.
- **High-Risk**: Destructive or privileged mutation.

All executable non-reflex commands require per-command authentication evidence.

---

## 🧩 Policy and Automation Modes

The **Effective Mode** you see in the Operator Deck is the real-time result of these policy layers.

| State | Resulting Mode |
| :--- | :--- |
| **Verified Voice + Trusted Domain** | **PILOT** (Full Authority) |
| **Unknown Voice + Trusted Domain** | **Block executable commands** |
| **Verified Voice + Sensitive Domain** | **ASSIST/PILOT per domain policy** |
| **Unknown Voice + Sensitive Domain** | **Block executable commands** |
| **Any Voice + Restricted Domain** | **LOCKED** (No Automation) |

Unknown speaker recognized commands are blocked immediately by policy.

Reflex safety commands (`stop`, `cancel`, `pause`) remain available.

## App-Scoped Mode Authority

Operator mode is app/window scoped, not desktop-global.

- Browser mode changes originate from extension controls.
- Desktop runtime syncs to focused app mode before authorization checks.
- This prevents desktop-mode drift when multiple apps/windows use different mode settings.

---

## ⚙️ Customizing Policy

You can manage your domain-specific overrides in the **Ecosystem Configuration**. 

- **Always Pilot**: Force a domain into Pilot mode (not recommended for sensitive sites).
- **Strict Mode**: Force 2FA or explicit confirmation for every mutation, regardless of identity confidence.
- **Deny-List**: Completely block Maestro from interacting with specific sites or internal TLDs.

> [!TIP]
> Use the **Policy Preview** panel in the Operator Surface to see why a specific mode is currently active for your current tab.
