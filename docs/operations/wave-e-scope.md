# Wave E Scope: Historical And Provenance Audit

## Objective

Separate active product documentation from historical and provenance material without falsifying source history.

## Program State

- Wave D closed as `prepared + deferred`.
- Wave E completed as a content-governance and public-surface hygiene wave.

## Wave E Phases

### E1: Inventory And Classification

Deliverables:

- full inventory of historical/provenance surfaces across repo docs and public-facing retained content
- classification table with one of: `preserve`, `annotate`, `rewrite`, `archive`, `remove`
- rationale per item cluster

Exit criteria:

- every in-scope surface is classified
- no `unknown` classification remains

### E2: Active Surface Rewrite Pass

Deliverables:

- rewritten active user-facing docs that still carry stale legacy framing
- updated links/screenshots/examples aligned with current Arqon Maestro positioning

Exit criteria:

- active onboarding and usage docs no longer depend on inherited product messaging
- link checker and docs build pass

### E3: Provenance Preservation And Annotation

Deliverables:

- provenance notes on retained historical docs that must remain intact
- archive index for intentionally preserved historical material

Exit criteria:

- legal/provenance materials are preserved accurately
- retained historical pages are explicitly marked as historical/provenance where needed

### E4: Hard-Close Pack

Deliverables:

- Wave E evidence doc
- Wave E closeout doc
- modernization matrix update with residual risks and next-wave handoff

Exit criteria:

- all E1-E3 deliverables completed
- hard-close docs published and linked in nav

## Guardrails

1. Do not rewrite legal or provenance text inaccurately.
2. Do not leave stale inherited product messaging in active user paths.
3. Prefer explicit annotation over silent deletion when traceability matters.
4. Keep migration decisions recorded in decision log + gotcha registry.

## Test/Validation Requirements

- `mkdocs build` passes
- internal links resolve for updated docs
- spot-check public-facing pages for stale endpoint/ownership claims

## Initial Execution Order

1. classify `maestro/README.md`, `maestro/web/`, and inherited docs under `maestro/docs/`
2. execute active-surface rewrites
3. apply provenance annotations and archive notes
4. publish evidence + closeout
