# External Infrastructure Ownership Plan

This plan tracks the work that remains after the seven-phase internal rebrand program.

It exists because the internal code and runtime identity are now rebranded, but several external surfaces still use inherited ownership and naming.

> Video placeholder: external infrastructure ownership roadmap.

## Objective

Move Arqon Maestro from inherited external service ownership to Arqon-owned infrastructure where that change is operationally justified and technically safe.

## In Scope

- stream endpoint ownership and naming
- CDN / model-download ownership
- Docker image ownership and names
- marketplace/release/distribution ownership
- external repository ownership that still blocks clean Arqon identity

## Out Of Scope

- internal runtime/process naming that was already closed in the seven-phase rebrand
- historical/provenance docs and blog content
- generic build-warning cleanup that does not involve ownership

## Current Known External Surfaces

- `stream-*.serenade.ai`
- `serenadecdn.com`
- `serenadeai/...` repository ownership in dependency/config references
- inherited Docker image names
- inherited marketplace/plugin ownership references

## Workstreams

### 1. Endpoint Ownership

Goal:

- replace inherited streaming endpoint ownership with Arqon-controlled endpoints

Key questions:

- what service topology is the intended Arqon replacement?
- what auth/token changes are required?
- what migration path preserves existing users during cutover?

### 2. Model and Artifact Distribution

Goal:

- replace inherited CDN/model distribution endpoints with Arqon-controlled distribution

Key questions:

- where will models live?
- what retention/versioning policy applies?
- what download integrity/signing model is required?

### 3. Image and Release Ownership

Goal:

- move any inherited container/release ownership to Arqon-owned publishing

Key questions:

- what images still matter operationally?
- which registries will Arqon use?
- what old references remain in docs and scripts?

### 4. External Repository Ownership

Goal:

- identify which inherited external repo references are still real dependencies and which are just stale metadata

Key questions:

- which repos must be mirrored, forked, or replaced?
- which references should remain as provenance only?

## Safety Rules

1. do not point production/runtime config at non-existent Arqon endpoints
2. cut over one ownership surface at a time
3. keep rollback targets documented for each ownership migration
4. validate auth, downloads, and update flows end-to-end before removing inherited endpoints

## Evidence Requirements

Before closing any infrastructure ownership item, capture:

- exact old endpoint or ownership surface
- exact new endpoint or ownership surface
- migration/rollback steps
- runtime verification
- user-facing/docs updates

## Entry Checklist

- inventory all inherited external surfaces
- classify each as `active dependency`, `stale metadata`, or `historical reference`
- choose the first ownership surface to migrate

## Initial Recommended Order

1. inventory and classify all external surfaces
2. move documentation to describe the current inherited endpoints honestly
3. design Arqon-owned endpoint and distribution replacements
4. migrate runtime config only after the replacements exist
