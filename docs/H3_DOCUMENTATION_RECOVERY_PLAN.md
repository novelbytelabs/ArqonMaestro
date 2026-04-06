# H3_DOCUMENTATION_RECOVERY_PLAN

Status:
Active recovery and acceleration plan

Purpose:
Bring H3 / Arqon Maestro documentation up to a level that supports:
- engineers
- developers
- operators
- product/strategy reviewers
- users

Problem statement:
Documentation debt is now large enough to slow engineering, frustrate developers, and create user-facing confusion.
This document defines the documentation groups, priority order, ownership expectations, and deliverables needed to recover.

## Documentation doctrine

1. Documentation is part of the product.
2. No major stage should close without stage plan + validation report + schema updates.
3. Internal system truth must remain consistent with the constitutional order:
   - live voice geometry proposes
   - focus/task reshapes ranking and legality
   - memory supplies priors
   - governance decides execution
4. Internal communication is protobuf / type-directed.
5. JSON is human-facing only.
6. Artificial or incomplete surfaces must be disclosed, not hidden.

## Documentation groups

### Group A — Constitutional / Control docs
Audience:
Architects, leads, safety/governance owners

Purpose:
Freeze the non-negotiable truths of the system.

Required docs:
- H3_MASTER_PLAN_V3.md
- H3_ARTIFICIAL_SURFACES_REGISTER.md
- H3 constitutional doctrine / execution ordering doc
- stage closure reports
- validation-gate policy doc
- internal communication contract note (protobuf vs JSON)

Priority:
P0

### Group B — Stage docs
Audience:
Engineers, PM AI, reviewers

Purpose:
Make every stage executable, auditable, and resumable.

Required per stage:
- stage plan
- stage validation report
- runtime evidence schema updates
- status report / closure note
- known integration fixes note when necessary

Current status:
- 3D3 documented
- 3E1 documented
- 3E2 documented
- 3F documented
- 3G active and must stay current as slices advance
- 3H documentation must be created now before implementation accelerates

Priority:
P0

### Group C — Engineering runtime docs
Audience:
Engineers implementing runtime behavior

Purpose:
Explain how the runtime actually works.

Required docs:
- chunk-manager architecture
- voice-semantic-address-registry architecture
- H3 runtime evidence event model
- CFH / STT integration note
- focus-conditioned command geometry note
- policy-shaped atlas shard note
- multi-resolution atlas note
- counterfactual / repair intelligence note
- HPO / homeostasis integration note for 3H

Priority:
P1

### Group D — Developer integration docs
Audience:
Developers extending or debugging the system

Purpose:
Make the repo buildable and the stage workflow understandable.

Required docs:
- branch / baseline policy
- bundle-application workflow
- local validation gate guide
- regression expectations guide
- test harness isolation guide
- how to add evidence fields safely
- how to avoid null/undefined contract drift
- how to add protobuf-internal / JSON-human-facing surfaces correctly

Priority:
P1

### Group E — User / operator docs
Audience:
End users, internal operators, demonstrations, onboarding

Purpose:
Explain what Maestro does and how it behaves without leaking internal complexity.

Required docs:
- user guide by lane
- command behavior and limitations
- focus/context behavior explained simply
- safety / ambiguity / repair behavior explained simply
- settings / homeostasis / diagnostics guide
- troubleshooting guide

Priority:
P2

### Group F — Research-to-product bridge docs
Audience:
Research leads, advanced engineers, PM AI

Purpose:
Prevent RSI / autopoiesis / Lazarus / HPO ideas from drifting away from product work.

Required docs:
- research integration matrix
- 3G RSI/Lazarus integration note
- 3H EO6/HPO integration note
- 3I EO6/EO8/DreamCycle integration note
- 3J RSI/EO7/Lazarus atlas intelligence note
- 3K EO8/HPO/Ouroboros calibration + security note
- 3L EO9 frontier note

Priority:
P1

## Immediate documentation backlog to create

### P0 — do now
1. H3_ARTIFICIAL_SURFACES_REGISTER.md
2. H3_STAGE3G_STATUS_REPORT.md
3. H3_STAGE3H_PLAN.md
4. H3_PROTOBUF_INTERNALS_NOTE.md
5. H3_VALIDATION_GATES_GUIDE.md

### P1 — next wave
1. H3_RUNTIME_CHUNK_MANAGER_ARCHITECTURE.md
2. H3_VOICE_SEMANTIC_ADDRESS_REGISTRY_ARCHITECTURE.md
3. H3_COUNTERFACTUAL_REPAIR_INTELLIGENCE_TECHNOTE.md
4. H3_HOMEOSTASIS_HPO_INTEGRATION.md
5. H3_TEST_HARNESS_ISOLATION_GUIDE.md
6. H3_NULL_UNDEFINED_CONTRACT_GUIDE.md

### P2 — after that
1. user-facing Maestro guide
2. operator diagnostics guide
3. troubleshooting guide
4. examples / workflows guide

## Stage 3H documentation package required before deeper implementation

Before major 3H coding accelerates, create:
- H3_STAGE3H_PLAN.md
- H3_STAGE3H_ARCHITECTURE.md
- H3_HOMEOSTASIS_HPO_INTEGRATION.md
- H3_DYNAMIC_PRECISION_REGIMES_NOTE.md
- H3_PROTOBUF_INTERNALS_NOTE.md

Reason:
3H is where Turbo / Tight / Ultra and homeostatic actuation become real.
That work must be heavily documented before it grows.

## Working agreement going forward

For every new stage slice:
- update stage plan
- update evidence schema if needed
- update artificial surfaces register if needed
- record any compatibility fix that alters baseline expectations
- keep docs in sync with the real validated repo state, not just the original bundle intent

## Success criteria for documentation recovery

Documentation recovery is considered healthy when:
- every active stage has a current plan and validation report
- every major runtime subsystem has an architecture note
- every new artificial surface is disclosed
- the engineering team can reproduce the bundle/gate workflow without tribal knowledge
- user/ops docs exist for the visible system behavior
