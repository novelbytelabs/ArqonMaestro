# Historical And Provenance Audit Plan

This plan tracks the inherited documentation, website, blog, and provenance surfaces that still contain historical naming or ownership references after the internal rebrand completed.

> Video placeholder: provenance audit workflow.

## Objective

Separate:

- what should be rewritten into Arqon Maestro language
- what should be preserved as provenance
- what should be archived or removed from active surfaces

## In Scope

- inherited READMEs retained under `maestro/`
- legacy website pages and blog posts
- historical docs that are no longer the canonical user manual
- contribution/protocol/custom-command pages that still reference inherited public ownership
- stale screenshots, links, and examples

## Out Of Scope

- live runtime config and infrastructure ownership
- active build/runtime namespace work already closed in Phase 7
- license text that must remain historically accurate

## Audit Categories

### 1. Provenance Must Preserve History

Examples:

- upstream license text
- original contribution history
- third-party origin references that should not be falsified

Action options:

- preserve
- annotate
- move to archive

### 2. Historical But Still Public

Examples:

- old blog posts
- retained website pages
- historical READMEs in vendored or inherited components

Action options:

- rewrite for Arqon framing
- add historical note
- de-index from active docs nav

### 3. Stale Product Messaging

Examples:

- inherited docs that are not provenance and still describe the product publicly
- plugin pages still pointing to old ownership
- outdated command/setup instructions

Action options:

- rewrite
- redirect
- remove from active surface

## Audit Method

1. inventory historical/provenance surfaces
2. classify each file or page:
   - `preserve`
   - `annotate`
   - `rewrite`
   - `archive`
   - `remove`
3. record why that treatment is correct
4. execute category by category instead of file by file chaos

## Safety Rules

1. do not rewrite legal/provenance text inaccurately
2. do not leave stale public product messaging in active user flows
3. preserve historical context explicitly when a document remains for provenance
4. prefer annotation over silent deletion when historical traceability matters

## Initial Audit Targets

- `maestro/README.md`
- `maestro/web/`
- inherited internal docs under `maestro/docs/`
- any retained public-facing plugin/integration pages that still reference inherited ownership

## Evidence Requirements

For each audited batch, capture:

- inventory of files/pages reviewed
- classification decision for each cluster
- rationale
- resulting edits or archival action
- residual historical references intentionally preserved

## Initial Recommended Order

1. audit `maestro/README.md` and retained inherited docs
2. audit `maestro/web/` public surfaces
3. audit inherited plugin/integration/public-reference pages
4. publish an archive/provenance note if historical material remains in-tree
