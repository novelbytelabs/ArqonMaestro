# Profiles Tab Recommendations

## State Separation: The Core Design Law

The Profiles tab must represent three different truths, separately. Most designs collapse these, but they must remain distinct:

### 1. Profile Lifecycle

* active
* suspended
* revoked

### 2. Security Readiness

* passkey ready
* voice ready
* PIN ready
* recovery ready

### 3. Live Room/Runtime State

* joined_not_yet_active
* active
* stale
* locked
* expired

The word "Active" will become a mess if these are not separated.

---

## Recommendations

### 1. Make "State Separation" the Top-Level Design Rule

Every human profile should display Lifecycle, Security readiness, and Room/runtime state as separate visual groups.

Not just:

* `IRBSurfer ACTIVE`

But more like:

* `Lifecycle: Active`
* `Security: Passkey Ready | Voice Ready | PIN Missing | Recovery Disabled`
* `Room: Joined, Not Yet Active`

### 2. Add a Readiness Summary Block to Every Human Profile Card

The human profile card should answer immediately:

* Is this person usable right now?
* If not, what exactly is missing?

**Security readiness**

* Passkey: Ready
* Voice: Needs capture retry
* PIN: Missing
* Recovery: Disabled

**Next step**

* Complete voice setup
* Set PIN

This is stronger than just a matrix with status dots.

### 3. Make Humans and Agents Not Just Separate Tabs, But Separate Card Models

Do not use the same fields or visual grammar.

**Human cards need:**

* display name
* role
* lifecycle
* readiness
* room state
* last auth / last voice verify
* policy tier

**Agent cards need:**

* agent name
* workload identity health
* credential status
* authorization scope
* voice persona
* runtime state

Humans and agents are not "two kinds of profile." They are two identity species. That difference should be visible immediately.

### 4. Add Freshness, Not Just Readiness

"Ready" is not enough. You also need:

* last passkey auth
* last PIN unlock
* last voice verification
* whether step-up freshness is still valid

In Maestro:

* configured ≠ satisfied
* satisfied ≠ fresh
* fresh ≠ globally reusable

The tab should show:

**Trust freshness**

* Last root auth: 14m ago
* Last PIN unlock: 3m ago
* Last voice verify: live
* Current trust window: active until stale

### 5. Profiles Tab Should Be Long-Lived Identity Management, Not Live Room Management

**Profiles tab = long-lived control plane**

* create person
* edit identity
* enroll/rotate passkey
* set/reset PIN
* recovery controls
* voice enrollment
* suspend/revoke/delete
* policy tier

**Participants popup = live room surface**

* join room
* unlock me
* leave room
* show trust window
* show live room state

Do not let the Profiles tab become a second room roster. That would muddy the control plane.

### 6. Replace Generic "Re-enroll" with Precise Labels

"Re-enroll" is too vague. Use:

* `Re-enroll Voice`
* `Rotate Passkey`
* `Reset PIN`
* `Enter Recovery`
* `Reauthenticate`

Vague language creates security confusion.

### 7. Add a Clear "Danger Zone" Separation

**Normal actions**

* Switch
* Rename
* View details

**Security actions**

* Manage Security
* Re-enroll Voice
* Set/Reset PIN
* Join/Unlock room

**Dangerous actions**

* Suspend
* Revoke
* Delete

Destructive and trust-mutating actions should never visually sit like ordinary UI buttons.

### 8. Add Policy Tier Visibly on Every Human Profile

Every human profile should show:

* Personal
* Standard
* Developer
* Enterprise
* Admin

And ideally a short summary like:

* normal room use allowed
* high-risk requires fresh passkey
* security mutations require fresh passkey only

### 9. Add an Audit Summary, Not Just Mutation Receipts

Add a persistent summary on the profile:

* Last root auth
* Last voice re-enrollment
* Last passkey rotation
* Last PIN reset
* Last recovery event
* Last blocked high-risk action

Profiles should help answer: "What is going on with this identity?" not just "What buttons can I click?"

### 10. Design the Profiles Tab So It Can Power the Startup Chooser Later

The profile model should support a lighter startup selector. Every human profile should have the minimal fields needed for:

* startup chooser
* shared-room join list
* room participant add flow

Such as:

* display name
* avatar/voice icon if desired
* lifecycle
* readiness
* last used
* policy tier

### 11. Add an Explicit "Not Operationally Ready" State

A human profile may exist, be active as a lifecycle object, but still not be operationally ready.

The tab should support:

* created
* setup incomplete
* operationally ready
* joined_not_yet_active
* active in room
* stale
* locked
* revoked/suspended

### 12. Add a Top-of-Page Identity Summary Bar

Above the cards, show:

* Humans loaded
* Agents loaded
* Current room mode: single-user / multi-user
* Current selected profile or room sponsor
* Count of active participants
* Any setup-needed alert

---

## Summary: Keep, Add, Tighten

**Keep**

* Human vs Agent split
* readiness matrix
* participant-state visibility
* manage security drawer
* no-bypass gates
* audit receipt UX
* joined_not_yet_active
* action model cleanup

**Add**

* state separation law
* freshness model
* policy tier visibility
* persistent audit summary
* danger zone separation
* startup chooser reuse model
* precise action labels
* top-level identity summary bar

**Tighten**

* "readiness matrix" should become a readiness + next-step summary
* "audit receipt UX" should be paired with a persistent audit summary
* "participant-state visibility" should explicitly separate from lifecycle state

---

## Implementation Priority

**Must-add now**

1. State separation: lifecycle vs readiness vs room state
2. Humans vs Agents with different card models
3. Readiness summary with exact missing requirements
4. Manage Security drawer
5. Precise labels instead of vague "Re-enroll"

**Next wave**

6. Freshness fields
7. Policy tier visibility
8. Danger zone
9. Audit summary
10. Startup chooser reuse

---

## Design Intent

The Profiles tab should answer, at a glance:

* Who is this identity?
* Is it a human or an agent?
* Is it alive, suspended, or revoked?
* Is it operationally ready?
* Is it presently trusted in the room?
* What is it allowed to do?
* What recently happened to it?

Do not design Profiles as a CRUD page with security add-ons; design it as the identity control plane for humans and agents under Maestro's trust law.
