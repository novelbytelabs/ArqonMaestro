# Wave D1 Ownership Inventory

This inventory is the operational source of truth for external surfaces that still depend on inherited infrastructure.

## Status

- Wave: `D`
- Scope: `ownership inventory + governance hard-close`
- Live cutover: `deferred`

## Classification Legend

- `Active Dependency`: currently used by runtime/build/release flow
- `Stale Metadata`: referenced in code/docs but not used in active paths
- `Historical Reference`: provenance-only mention

## Ownership Legend

- `Owned`: Arqon has domain/service/repo control today
- `Inherited`: controlled outside Arqon
- `Unknown`: ownership not yet confirmed

## External Surface Matrix

| Surface | Current Value | Classification | Ownership | User Impact | Migration Target | Cutover Blocker | Owner | Notes |
|---|---|---|---|---|---|---|---|---|
| Streaming endpoint | `stream-us-east-1.serenade.ai` (+ other regions) | Active Dependency | Inherited | High | Deferred | No Arqon endpoint/service coverage | Arqon (irbsurfer) | Runtime critical; keep inherited remote |
| Update/CDN URL | `https://serenadecdn.com/app` | Active Dependency | Inherited | High | Deferred | No Arqon artifact host + signing pipeline | Arqon (irbsurfer) | `maestro/client/package.json` publish url |
| Electron auto-update provider | `generic` provider using inherited URL | Active Dependency | Inherited | High | Deferred | Needs Arqon update endpoint + release pipeline | Arqon (irbsurfer) | Keep unchanged until D2 trigger |
| VS Code distribution identity | Marketplace/package ownership surface | Active Dependency | Inherited | Medium | Deferred | Arqon publisher migration not required yet | Arqon (irbsurfer) | Use current publishing path |
| Legacy docs/domain references | mixed `serenade.ai` links | Stale Metadata / Historical Reference | Inherited | Low-Med | Wave E provenance pass | Requires classification pass | Arqon (irbsurfer) | Coordinate with Wave E |

## Required Ownership Assignments

Assigned for current governance baseline:

- DNS/domain owner: `Arqon (irbsurfer)`
- TLS/certificate owner: `Arqon (irbsurfer)`
- CDN/artifact storage owner: `Arqon (irbsurfer)`
- Runtime streaming service owner: `Arqon (irbsurfer)`
- Desktop release/update owner: `Arqon (irbsurfer)`
- VS Code publisher owner: `Arqon (irbsurfer)`
- Incident/rollback owner: `Arqon (irbsurfer)`

## Mandatory Preconditions For D2 Cutover Work

1. Arqon-owned hostnames are allocated and resolvable.
2. TLS certs are provisioned and renewable.
3. Replacement services are reachable and health-checked.
4. Artifact/update hosting exists with integrity controls.
5. Rollback path is documented and tested.
6. Ownership contacts are explicit for all surfaces.

## Current Verdict

Wave D governance work is **complete** for the current program phase.

Live cutover is intentionally deferred. D2 migration starts only when:

- Arqon-owned endpoint and artifact infrastructure exists
- the Wave D readiness checklist is green
- a cutover window is explicitly approved
