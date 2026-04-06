Yes.

Continuing with **Spec 9**.

Suggested filename:

`docs/h3/H3_STAGE3J_SPEC_09_SUGGESTION_PRESSURE_AND_TIMING.md`

# 3J Spec 9 — Suggestion Pressure and Timing

## Document identity

**Title:**
Arqon Maestro 3J Suggestion Pressure and Timing

**Stage:**
`3J`

**Spec role:**
Surfacing-pressure, timing, and channel-selection specification

**Purpose:**
Define how `3J` decides whether a valid workflow/macro candidate should be:

* held silently
* deferred for later
* surfaced in inbox
* surfaced inline
* auto-created quietly as a draft
* reserved for sleep-mode or digest presentation

This spec governs **when**, **how**, and **how much** `3J` should surface workflow creation opportunities without becoming noisy, repetitive, or badly timed.

---

## 1. Mission

`3J` needs a suggestion pressure and timing system because even excellent workflow candidates can become bad user experiences when surfaced at the wrong time, in the wrong channel, or at the wrong frequency.

The mission of this system is:

**surface valid workflow-creation opportunities in a way that maximizes usefulness and trust while minimizing interruption, repetition, clutter, and timing friction.**

This is the calmness system of `3J`.

---

## 2. Core thesis

A workflow candidate can be:

* real
* useful
* low-risk
* well-abstracted
* worthy of promotion

and still be the wrong thing to surface **right now**.

So the core thesis is:

**validity is not enough; surfacing must also be timed, budgeted, and channeled correctly.**

This means `3J` must distinguish between:

* candidate quality
* candidate creation eligibility
* surfacing appropriateness

Those are not the same thing.

---

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_03_SCORING_MODEL.md`
* `H3_STAGE3J_SPEC_04_RISK_ENGINE.md`
* `H3_STAGE3J_SPEC_05_RUBRIC_FRAMEWORK.md`
* `H3_STAGE3J_SPEC_06_PROMOTION_ENGINE.md`
* `H3_STAGE3J_SPEC_07_WORKFLOW_DISCOVERY.md`
* `H3_STAGE3J_SPEC_08_WORKFLOW_SKELETON_INFERENCE.md`

This system governs **creation surfacing**, not execution.

It does not:

* execute workflows
* authorize execution
* bypass user creation policy
* turn drafts into actions

It decides how surfacing pressure shapes promotion and presentation.

---

## 4. Design requirements

The suggestion pressure and timing system must be:

* calm
* adaptive
* user-aware
* mode-aware
* channel-aware
* class-aware when appropriate
* respectful of training vs mature phases
* able to suppress repetition without hiding genuinely good candidates
* able to defer rather than discard
* explainable

It must avoid:

* spam
* repetitive rediscovery surfacing
* interrupting deep work unnecessarily
* suppressing too aggressively and starving learning
* blindly minimizing suggestions at the cost of losing valuable discoveries
* surfacing duplicates because timing state was ignored

---

## 5. Suggestion philosophy

`3J` should not behave like a nagging assistant.
It should behave like a disciplined curator.

That means:

* it should not surface everything discoverable
* it should not remain silent merely to look quiet
* it should not treat interruption as harmless
* it should not hide elite candidates because of crude volume suppression

The correct philosophy is:

**surface rarely enough to preserve trust, but not so rarely that truly valuable opportunities are buried.**

This is why `suggestion pressure` is a real first-class score.

---

## 6. Suggestion pressure score

### Field

`workflowCandidateSuggestionPressureScore`

### Scale

`0–100`

### Direction

Higher = more costly / less appropriate to surface right now

### Meaning

Measures how undesirable it would be to surface this candidate at this moment, in this channel, under this mode and queue state.

This score does not say whether the candidate is good.
It says whether now is a good time and channel.

---

## 7. Core timing law

The governing timing law is:

**A candidate may be worthy of creation but unworthy of immediate surfacing.**

This means the system must support:

* surfacing now
* surfacing later
* surfacing in a quieter channel
* holding for more evidence
* quietly auto-creating a draft without interruption, where policy permits

That flexibility is essential.

---

## 8. Surfacing channels

The timing system should reason across at least these channels:

1. silent hold
2. inbox
3. inline
4. digest
5. quiet auto-created draft notification
6. sleep-mode output queue

These are creation-surface channels, not execution channels.

### 8.1 Silent hold

No immediate user-facing surface.

Use when:

* pressure is high
* evidence is still maturing
* repetition would annoy
* the candidate is good but not yet right to show

### 8.2 Inbox

Non-interruptive review surface.

Use when:

* candidate is strong
* timing is not right for inline
* the user prefers quiet review
* suggestion budget is constrained

### 8.3 Inline

Immediate lightweight surface.

Use when:

* candidate is excellent
* timing pressure is low
* the interruption is justified
* the user/mode permits inline exposure

### 8.4 Digest

Batch surfacing in a grouped review period.

Use when:

* multiple good candidates exist
* the user is in quiet mode
* sleep-mode discovery produced strong items
* batch review is better than interruption

### 8.5 Quiet auto-created draft notification

A draft is created automatically, but the notification remains subtle.

Use when:

* candidate is low-risk
* auto-create is allowed
* the system wants minimal friction
* interruption is unnecessary

### 8.6 Sleep-mode output queue

Surfacing deferred to a later quiet-review cycle.

Use when:

* discovery work is happening out of band
* clustering/abstraction was heavier
* candidate quality is high but immediate surfacing is not warranted

---

## 9. Timing system inputs

The timing system should consider at least:

* suggestion pressure score
* user mode
* workflow class
* recent suggestion history
* queue size / backlog
* recency overlap
* candidate novelty freshness
* candidate urgency
* user preference settings
* training phase vs mature phase
* whether the candidate was already lightly surfaced
* whether this is a sleep-mode discovery artifact

---

## 10. Training mode vs mature mode

This is a major part of `3J`.

### 10.1 Training mode

Training mode exists to help the system learn preferences faster.

Expected behavior:

* more candidate review tolerated
* lower surfacing thresholds
* faster feedback loops
* more inbox/digest traffic permitted
* inline still bounded, but somewhat more acceptable when justified

Training mode is where the user teaches the system.

### 10.2 Mature mode

Mature mode exists after the system has gained stronger trust and preference knowledge.

Expected behavior:

* stricter surfacing thresholds
* stronger suppression of mediocre candidates
* lower overall suggestion volume
* more calm use of inbox/digest
* more reliance on auto-created low-risk drafts when permitted

This matches your view that the system should calm down as it learns.

---

## 11. Suggestion budgets

`3J` should maintain suggestion budgets.

A suggestion budget is a bounded allowance that prevents over-surfacing within a time window or context window.

Budgets should exist because:

* even good candidates can become annoying in aggregate
* user trust is harmed by volume overload
* review quality drops when the queue becomes noisy

### Types of budgets

#### Inline budget

How many inline surfaces are allowed in a bounded interval.

#### Inbox budget

How many new candidates should be added to inbox in a bounded interval before stronger triage applies.

#### Digest budget

How many items should be surfaced in one digest window.

#### Sleep-mode discovery budget

How many discovered candidates should be promoted into digest/inbox surfaces after sleep-mode mining.

### Important law

Budgets should not blindly suppress elite candidates.
They should instead push medium-quality candidates downward or later.

---

## 12. Suggestion queue pressure

The timing system should account for queue pressure.

Queue pressure reflects:

* how many pending unsurfaced or unreviewed candidate artifacts exist
* how saturated the inbox is
* whether new suggestions would create clutter rather than value

High queue pressure should tend to:

* reduce inline surfacing
* increase inbox triage
* increase hold behavior
* favor stronger deduplication
* favor digest grouping

This helps the system stay sane as it becomes more capable.

---

## 13. Recency and repetition suppression

The system must avoid repeatedly surfacing similar candidates too often.

It should track:

* recent exact suggestions
* recent near-duplicate suggestions
* recent class-level suggestions
* recent dismissals
* recent ignores
* recent accepted related patterns

### Effects

#### If recently suggested and ignored

Prefer suppression or hold.

#### If recently dismissed

Prefer stronger suppression.

#### If recently accepted

Related candidates may still surface, but should be deduplicated carefully.

#### If recently improved materially

Resurfacing may be justified.

The goal is not silence.
The goal is non-repetitive relevance.

---

## 14. Suppression windows and cooldowns

The timing system should support cooldown windows.

Cooldowns should vary by interaction outcome.

### Example cooldown behavior

#### Dismissed candidate

Longer suppression window.

#### Ignored candidate

Moderate suppression window.

#### Accepted candidate

Related candidates may remain discoverable, but duplicates should be heavily suppressed.

#### Auto-created draft

Similar candidates should face stronger deduplication and clutter checks.

Cooldowns should be:

* candidate-aware
* family-aware
* class-aware when needed

This is how `3J` avoids becoming repetitive.

---

## 15. Timing appropriateness by channel

Not every strong candidate belongs in the same channel.

### Inline should usually require

* high utility
* low pressure
* high novelty or obvious fit
* low interruption cost
* low duplication concern
* user/mode support

### Inbox should usually require

* strong enough candidate quality
* but not enough urgency or timing fit for inline
* or explicit user preference for quieter surfaces

### Digest should usually require

* high batch-review suitability
* moderate-to-high candidate quality
* non-urgent surfacing
* good explanation/readability

### Silent hold should usually apply when

* pressure is high
* evidence is promising but not ready
* queue load is high
* resurfacing would be redundant

---

## 16. Sleep-mode timing

Sleep mode is especially important for `3J`.

The system may use sleep mode to:

* mine repeated subsequences more deeply
* cluster similar workflow candidates
* refine skeletons
* merge duplicates
* prepare high-quality workflow draft candidates
* assemble digest-ready suggestion groups

### Sleep-mode surfacing law

Sleep-mode discovery should usually prefer:

* digest
* inbox
* quiet draft creation when policy allows

It should rarely cause aggressive inline interruptions immediately upon user return unless the candidate is exceptionally high-value and well-timed.

---

## 17. Suggestion pressure components

The suggestion pressure score should conceptually be shaped by components such as:

* interruption cost
* queue pressure
* recency overlap
* similarity to recent suggestions
* mode strictness
* review backlog
* urgency deficit
* timing opportunity quality

These components may later be formalized more precisely, but the concept should remain stable.

---

## 18. Urgency and timing opportunity

Most workflow candidates are not urgent.
But some may be especially timely.

Examples of timing opportunity:

* the user just completed a repeated sequence for the sixth time
* the system has very high confidence and low risk
* the candidate is highly legible and obviously valuable
* the user is in training mode and currently reviewing similar items

Timing opportunity is the positive counterpart to pressure.

A strong timing opportunity may justify:

* inline surfacing
* or quiet auto-created draft notice

A weak timing opportunity usually favors inbox/digest/hold.

---

## 19. Candidate freshness

A newly improved candidate may deserve surfacing even if earlier versions were held.

The system should distinguish between:

* stale resurfacing of the same weak artifact
* genuinely improved resurfacing due to:

  * better evidence
  * better abstraction
  * lower risk
  * stronger trust alignment
  * improved novelty or clearer utility

This is critical for allowing resurfacing when it is actually warranted.

---

## 20. Suggestion pressure by workflow class

Different classes may have different timing expectations.

### Navigation/editor

May tolerate more timely surfacing because the resulting drafts are often low-risk and understandable.

### Browser

May require stronger deduplication due to high ambient browsing noise.

### Cross-app

May benefit more from inbox/digest than inline, because explanation burden is higher.

### Shell/privileged

Should usually prefer calmer channels and stronger review discipline.

So timing is not class-blind.

---

## 21. User preference shaping

User settings should be able to shape timing behavior.

Examples:

* quiet mode
* balanced mode
* training mode
* aggressive discovery mode
* inbox-only mode
* allow inline for elite candidates only
* prefer sleep-mode digest review

Important law:

Preferences should shape surfacing behavior, not redefine what is real.
Discovery and candidate quality stay grounded in evidence.
Preferences mainly affect the timing and channel of presentation.

---

## 22. Auto-created draft timing

When low-risk auto-created drafts are allowed, the timing system still matters.

The system must choose whether to:

* create silently and place in draft library/inbox
* create and show subtle notification
* create and include in later digest
* defer creation until a calmer moment

### Important law

Even automatic creation does not justify noisy surfacing.

A system that auto-creates well but announces badly will still feel clumsy.

---

## 23. Channel downgrade logic

The timing system must support channel downgrades.

Examples:

* inline-worthy candidate downgraded to inbox due to queue pressure
* inbox-worthy candidate downgraded to digest due to quiet mode
* auto-create quiet notice downgraded to silent draft insertion due to interruption cost
* suggest-now candidate downgraded to hold due to strong recent overlap

Channel downgrade is one of the most important tools for keeping `3J` calm.

---

## 24. Suggestion pressure reason codes

The system should emit structured reason codes such as:

* `timing_inline_allowed`
* `timing_inbox_preferred`
* `timing_digest_preferred`
* `timing_hold_due_to_queue_pressure`
* `timing_hold_due_to_recent_overlap`
* `timing_training_mode_feedback_enabled`
* `timing_quiet_mode_strict`
* `timing_sleep_mode_candidate`
* `timing_interrupt_cost_high`
* `timing_inline_not_justified`
* `timing_auto_create_quiet_notification_preferred`

These reason codes are important both for debugging and future user-facing explainability.

---

## 25. Suggested default surfacing logic

Conceptually, the timing system should behave like this:

### If candidate quality is weak

* `observe_only`
* or `hold_for_more_evidence`

### If candidate quality is good but pressure is high

* route to inbox or digest
* or hold

### If candidate quality is strong and pressure is low

* inline may be allowed

### If candidate is low-risk and auto-create is allowed

* create draft
* choose quiet notification vs silent insertion based on pressure and mode

### If queue is saturated

* promote only elite candidates
* suppress or defer middling ones

That is the right high-level behavior.

---

## 26. What this spec must prevent

This spec exists to prevent:

* constant workflow suggestion spam
* rediscovery annoyance
* surfacing valid but badly timed candidates
* burying all good candidates out of fear of volume
* clumsy inline interruption
* overfilling inboxes with mediocre artifacts
* treating timing as a cosmetic concern rather than a trust concern

---

## 27. Relationship to promotion engine

This spec directly shapes the promotion engine by influencing:

* `suggest_in_inbox`
* `suggest_inline`
* `auto_create_draft` surfacing style
* suppression
* defer/hold behavior
* digest routing
* sleep-mode routing

This is how a candidate can be:

* promotion-worthy
  but
* not surfacing-worthy in the most aggressive channel

That distinction is crucial.

---

## 28. Relationship to future UI/API

This spec prepares later UI/API surfaces such as:

* workflow inbox
* digest summaries
* quiet creation notices
* suggestion history
* suppression controls
* “never suggest like this again”
* class-specific suggestion intensity settings

That is why timing and channel logic must be structured now, before the UI is built.

---

## 29. Non-goals of this spec

This spec does not fully define:

* scoring formulas
* final UI layout
* workflow execution
* persistence semantics
* candidate discovery algorithms
* approval UX details

It defines the logic that governs **when and where** candidates should surface.

---

## 30. Why this spec is holy-grail critical

A holy-grail system is not just powerful.
It is well-timed.

If `3J` becomes:

* repetitive
* intrusive
* constantly interruptive
* clutter-heavy
* unable to distinguish inbox from inline from digest

then even good workflow judgment will feel bad.

This spec is what gives `3J` calmness, pacing, and timing taste.

It is what lets the system:

* learn early
* surface wisely
* calm down later
* remain powerful without becoming stressful

That is a huge part of why users would ever trust it enough to permit low-risk auto-creation.

---

## 31. Summary

The `3J` suggestion pressure and timing system governs when and how a workflow candidate is surfaced.

It must distinguish between:

* candidate validity
* creation eligibility
* surfacing appropriateness

It must support:

* silent hold
* inbox
* inline
* digest
* quiet auto-created draft notification
* sleep-mode output

It must incorporate:

* pressure
* timing opportunity
* budgets
* queue load
* recency overlap
* user mode
* class-aware timing
* training vs mature behavior

This is the pacing and calmness layer of `3J`.

Next should be:

`docs/h3/H3_STAGE3J_SPEC_10_PREFERENCES_AND_TRUST_POLICY.md`
