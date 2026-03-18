> Status: background gap-analysis document.
>
> Use [`README.md`](./README.md) for the documentation map and [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) for the canonical planning sequence and missing-doc tracker.

Where we are still weak or unfinished

Now the honest part: what still remains.

1. We have not consolidated all of this into one canonical spec

Right now the design exists across our discussion, but it still needs to become a single formal artifact, probably something like:

maestro_spoken_command_grammar_v0_1.md

This is the biggest immediate missing piece.

2. We have not yet audited Serenade grammar and Talon grammar directly

- We said this is the right next comparative move, and it still is.
- We need a real source analysis of:
    - what Serenade already does well
    - what Talon does better
    - what Maestro should inherit
    - what Maestro should reject

That is still undone.

3. We have not yet created the parser tables

We have concepts, but not yet the concrete implementation artifacts like:

canonical verb registry

object registry

legality table

alias table

family precedence table

mode precedence table

scoring weights

That is the bridge from design to code.

4. We have not yet defined phonetic robustness

This is a major next step.

We have a lexicon, but we have not yet pressure-tested it for:

STT confusion

accent robustness

homophones

too-similar words

fragile abbreviations

“one/two” chooser conflicts

terminal/editor/browser noise under real speech

This is probably the most important remaining language-design topic.

5. We have not yet frozen the first official command inventory

We have sample commands and family structures, but not yet:

the official first 100 commands

core vs extended commands

beginner vs expert forms

mandatory support set for v0.1

That still needs to be done.

6. We have not yet mapped language to runtime services fully

The language is strong, but we still need:

parse result → executor mapping

focus transfer policy

bound execution policy

integrated terminal vs external terminal routing policy

chooser → preference writeback model in concrete runtime terms

That work still remains.

7. Speaker identity is recognized as critical, but not fully integrated into grammar/state behavior

We know it matters. We have not yet formalized:

how speaker identity affects interpretation

how secure mode changes grammar/chooser/confirmation

how shared-room mode modifies default behavior

which commands remain always available under uncertainty

That is still a major architecture topic.

8. We have not yet produced the implementation roadmap for the language system

We have the architecture, but not yet:

what to prototype first

what parser to build first

what registry to freeze first

what to test first

what to defer

This is still needed.

**My current maturity assessment**
If I had to score where we are:

Conceptual architecture

Very strong
We have the right ideas.

Language design

Strong and emerging
The foundations are excellent.

Formal specification quality

Partially complete
Needs consolidation into canonical docs.

Runtime binding

Moderately specified
Clear direction, but not yet implementation-tight.

Implementation readiness

Not yet ready to code blindly
We need one more pass of formalization before building the parser seriously.

So I would say:

We are past ideation, deep into architecture, and approaching formal specification.

That is a very good place to be.

What is left to do, in the right order

This is the sequence I would recommend now.

Phase 1: Consolidate the language

Create one canonical doc:

maestro_spoken_command_grammar_v0_1.md

This should unify:

constitution

lanes

verbs

objects

legality

surfaces

interpretation

chooser

preferences

command families

modes

syntax

lexicon

This is the first big thing.

Phase 2: Audit Serenade and Talon grammar

Create:

maestro_grammar_source_analysis.md

We should compare:

Serenade grammar

Talon grammar

Maestro inheritance plan

This will sharpen the design with real precedent.

Phase 3: Do phonetic robustness

Create:

maestro_phonetic_robustness_v0_1.md

This should evaluate:

fragile terms

safe abbreviations

homophone hazards

STT survivability

chooser selection word conflicts

recommended vocabulary substitutions

This is a major remaining piece.

Phase 4: Freeze the first official command set

Create:

maestro_command_set_v0_1.md

This should define:

first 100 canonical commands

mandatory support commands

family coverage

beginner and expert forms

Phase 5: Freeze the parser registries

Create:

verb registry

object registry

alias registry

legality matrix

mode table

precedence table

chooser policy table

Now the language becomes implementable.

Phase 6: Map language to runtime

Tie grammar to:

focus system

executor policy

chooser UI

preference storage

Talon / Playwright / UI.Vision / ArqonMCP routing

That is where language meets runtime.

What I think the single biggest remaining design topic is

Right now, the highest-value remaining design topic is:

phonetic robustness and speech survivability

Because we now have:

a language

a syntax

a lexicon

But we have not yet tested whether the words we chose are actually the best spoken words for a real VOS.

That is the next thing that could materially improve the language.
