# Maestro Talon Integration Strategy v0.1

## Purpose

Talon clearly matters to Maestro.

It is powerful because it can act across arbitrary visible applications, bridge gaps where no native API exists, and provide a broad desktop control surface.

It is also dangerous to place carelessly into the architecture, because Talon can blur the line between:

* lawful semantic control
* broad UI actuation
* hidden focus changes
* risky fallback automation

This document defines how Talon should fit into Maestro without becoming the accidental center of the system.

---

# 1. Core principle

## Talon should be an actuation provider behind Maestro, not the sovereign command language

Maestro owns:

* language
* interpretation
* command legality
* policy
* routing
* chooser behavior
* safety and confirmation rules

Talon may provide:

* focus transfer
* mouse/keyboard style actuation
* visible desktop fallback interaction
* some structured accessibility-assisted actions when available

This separation is essential.

If Talon becomes the place where command meaning lives, Maestro stops being a Voice Operating System and becomes a relay.

---

# 2. Recommended integration topology

For v0.1, the recommended topology is:

**Maestro calls Talon through an adapter boundary.**

Not the reverse.

Conceptually:

```text
speech
  ↓
Maestro interpretation
  ↓
command/workflow contract
  ↓
router + actuation policy engine
  ↓
Talon adapter if selected
  ↓
Talon realization path
```

This means Talon is one execution route inside Maestro’s runtime, not a peer parser that competes for ownership of language.

---

# 3. What Talon should own

Talon should own only the things it is genuinely good at.

## A. Visible desktop actuation

Examples:

* click visible target
* move pointer
* scroll visible region
* press key sequence

## B. Focus transfer fallback

Examples:

* activate visible window
* move focus into a visible surface
* navigate desktop UI when no native focus path exists

## C. Cross-app fallback operations

Examples:

* reach nonintegrated apps
* act on visible UI where Maestro has no direct adapter

## D. Potential accessibility-assisted operations

If Talon can expose structured assistive information through a controlled adapter surface, Maestro may treat some Talon routes as Tier 3 rather than Tier 4.

But that must be declared explicitly, not assumed.

---

# 4. What Talon should not own

Talon should not own:

* canonical spoken grammar
* command legality rules
* mode interpretation
* chooser policy
* preference semantics
* security policy
* speaker identity policy
* authoritative command parsing for Maestro’s operating language

Talon may have its own command language in the broader ecosystem.
That is fine.
But inside Maestro, Talon should be treated as an actuator, not as the source of truth for what the user meant.

---

# 5. The Talon adapter model

Maestro should integrate Talon through a dedicated adapter that declares:

* available Talon executors
* supported verbs
* supported object classes
* supported surfaces
* trust tier
* execution modes
* undo and rollback characteristics
* security sensitivity
* latency and reliability

The Talon adapter should fit the same registry model as every other adapter.

That means Talon does not get special routing privileges.

---

# 6. Talon route classes

The Talon adapter should expose route classes explicitly.

## A. Window/focus routes

Examples:

* focus visible app window
* bring a window to foreground
* focus visible panel through UI actuation

Likely trust:

* Tier 3 if accessibility-assisted
* Tier 4 if purely visual

## B. Pointer routes

Examples:

* click visible target
* double click target
* hover
* drag

Likely trust:

* usually Tier 4

## C. Keyboard routes

Examples:

* key chord fallback
* menu navigation fallback
* structured hotkey path

Likely trust:

* Tier 3 or Tier 4 depending target certainty

## D. Hybrid routes

Examples:

* focus with visible targeting, then keyboard fallback
* accessibility locate, then visual act

These must declare their effective trust tier conservatively.

---

# 7. When Talon should be preferred

Talon should be preferred when all of the following are true:

* no higher-trust semantic route exists
* the target is visible and stable enough
* the action is low or moderate risk
* the command semantics survive visible actuation
* policy allows the required trust tier

Good examples:

* focus a visible window
* click a visible low-risk button
* scroll a visible pane
* activate a visible search field

---

# 8. When Talon should be allowed but not preferred

Talon may be an acceptable fallback when:

* a semantic route exists but is currently unavailable
* accessibility data is partial
* the command is visible and targetable
* the downgrade does not materially change user intent

Examples:

* `focus browser`
* `show sidebar`
* `click first result` when DOM route is unavailable but the result list is visibly stable

In these cases, the actuation policy engine should decide whether Talon fallback is acceptable.

---

# 9. When Talon should be blocked

Talon should usually be blocked for:

* destructive filesystem operations
* privileged system operations
* meaning-sensitive semantic code actions
* risky form submission
* actions requiring exact hidden-state understanding
* commands where the target cannot be robustly identified visually

Examples:

* `rename symbol token map to token index`
* `delete file secrets.toml`
* `run privileged command`
* `send that`

Maestro should not say “close enough” and let Talon guess.

---

# 10. Talon and focus semantics

Talon matters most when focus transfer is part of the route.

Rules:

* if Talon is used for focus, the visible focus change must actually occur
* if Talon cannot guarantee visible focus transfer, the route should be blocked
* Talon should not be treated as bound execution unless a declared capability truly supports that

This preserves one of Maestro’s key language laws:

**focus is part of the language.**

Talon must not secretly violate that model.

---

# 11. Talon and execution modes

For v0.1, Talon should generally be treated as supporting:

* `focus_transfer`: yes
* `bound_execution`: no by default
* `background_execution`: no

If future Talon integration exposes structured app-aware capabilities that act without visible transfer, those should be declared explicitly and treated as a different route class.

Do not grant bound execution semantics to Talon by default.

---

# 12. Talon and trust tiers

The default Talon posture should be conservative.

## Default assumption

Talon is Tier 4 raw visual actuation.

## Upgraded assumption

A specific Talon executor may be treated as Tier 3 only if:

* it is backed by structured accessibility or similarly inspectable targeting
* target identity is explicit enough
* failure reporting is structured enough for policy and recovery

This upgrade must happen per executor capability, not globally.

---

# 13. Talon and chooser behavior

Talon routes should interact cleanly with chooser and clarification.

Allowed pattern:

* Maestro cannot determine the target confidently
* chooser resolves the target
* Talon then executes against the resolved visible target

Forbidden pattern:

* Maestro is unsure
* Talon is invoked anyway to “see what happens”

Chooser should increase Talon safety, not serve as theater around guesswork.

---

# 14. Talon and repair/recovery

Talon routes need stronger recovery behavior because they are less semantically grounded.

When Talon fails, Maestro should prefer:

* explicit block
* chooser
* route downgrade/upgrade reconsideration
* retry only when the target is still clearly present

Maestro should avoid:

* unbounded repeated clicking
* repeated keystroke retries that may drift state
* silent escalation from failed Talon route into riskier Talon route

Recovery must stay visible and conservative.

---

# 15. Talon and security posture

In secure mode:

* Talon should be heavily restricted
* Tier 4 Talon routes should usually be blocked for anything beyond low-risk UI navigation
* confirmation should increase when Talon is the only available route

In shared-room mode:

* Talon should not be used for medium/high-risk actions without stronger gating
* ambiguous visible-target actions should be downgraded to chooser or refusal

Talon is exactly the kind of route that policy must constrain more aggressively, not less.

---

# 16. Talon and observability

If Talon is used, the audit trace should record it explicitly.

At minimum:

* route chosen = Talon
* route class
* trust tier
* target identification method
* whether chooser preceded execution
* whether visible focus transfer occurred
* whether retry or recovery was invoked

This is especially important because users will reasonably ask:

* why did you use Talon
* why didn’t you use a native route
* what safer route was unavailable

Those answers should come from structured trace data.

---

# 17. Command ownership boundary

Command ownership should be divided like this:

## Maestro owns

* speech interpretation
* command and workflow contracts
* routing
* policy
* confirmation
* chooser
* recovery strategy
* audit history

## Talon owns

* the execution details of the Talon-selected route
* target realization within Talon’s declared capability
* structured execution result returned through the adapter

This boundary keeps the system coherent.

---

# 18. Future bidirectional integration

A bidirectional relationship may be useful later, but it should not be the v0.1 default.

Possible future uses:

* Talon emits environment events Maestro can consume
* Talon exposes richer accessibility or targeting metadata
* Maestro and Talon coordinate on desktop context

Even then, the principle should remain:

Talon may inform Maestro.
Maestro still governs command meaning and safety.

---

# 19. Recommended v0.1 implementation stance

For v0.1, I recommend freezing this posture:

* Talon is a fallback adapter behind Maestro
* Talon is not a peer command owner
* Talon is mostly Tier 4, with limited executor-specific Tier 3 upgrades
* Talon supports focus-transfer routes and visible UI fallback
* Talon is policy-constrained by the actuation policy engine
* Talon usage is explicitly auditable and explainable

This is strong enough to be useful without letting Talon distort the architecture.

---

# 20. Example routing cases

## Example 1: `focus terminal`

Possible routes:

1. IDE subsurface focus
2. OS window manager
3. Talon focus fallback

Policy:

* Talon allowed if higher routes unavailable and visible target is clear

## Example 2: `click first result`

Possible routes:

1. DOM click
2. accessibility click
3. Talon click fallback

Policy:

* Talon allowed only if the first result is visibly stable and low risk

## Example 3: `open definition`

Possible routes:

1. LSP definition
2. editor command fallback
3. Talon UI navigation fallback

Policy:

* Talon should normally be blocked because semantic fidelity collapses

## Example 4: `delete file secrets.toml`

Possible routes:

1. filesystem API
2. editor explorer semantic action
3. Talon visual deletion

Policy:

* Talon blocked by default

---

# 21. Laws to freeze

## Law 1

Maestro owns language and policy; Talon provides execution capability only.

## Law 2

Talon must integrate through the same adapter and registry model as every other execution route.

## Law 3

Talon routes are fallback routes by default, not preferred semantic routes.

## Law 4

Talon does not imply bound execution unless a specific capability declares it lawfully.

## Law 5

Meaning-sensitive, destructive, privileged, or externally irreversible actions should not silently degrade into Talon fallback.

## Law 6

Chooser and policy must resolve ambiguity before Talon executes, not after.

## Law 7

Secure and shared-room modes should constrain Talon more aggressively than native semantic routes.

## Law 8

Talon use must remain visible, explainable, and auditable.

---

# 22. What this unlocks

Once this strategy is frozen, Maestro can benefit from Talon’s reach without surrendering:

* language sovereignty
* deterministic routing
* safety policy
* focus semantics
* route explainability

That is the right relationship:

Talon expands Maestro’s hands, but it does not replace Maestro’s brain.
