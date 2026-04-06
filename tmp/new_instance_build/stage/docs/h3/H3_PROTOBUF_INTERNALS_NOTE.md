# H3_PROTOBUF_INTERNALS_NOTE

Date:
April 3, 2026

Status:
Control note

Purpose:
Freeze the communication rule for H3 and nearby Maestro runtime systems.

## Rule

Internal communication must use:
- protobuf-defined contracts, or
- strongly typed internal runtime structures that are explicitly compatible with protobuf-oriented evolution

JSON is reserved for:
- human-facing artifacts
- logs meant for human inspection
- reports and validation summaries
- external explanatory documentation

## Implications

Not acceptable for internal control paths:
- ad hoc JSON blobs as hidden runtime protocol
- stringly typed control messages passed between critical subsystems
- silently evolving shapes with no schema discipline

Required practice:
- type-directed internal event models
- controlled schema evolution
- explicit documentation when an internal surface is observational-only and not yet fully promoted

## Relationship to H3 work

This rule applies to:
- H3 runtime evidence event shapes as internal typed surfaces
- future regime control messages in 3H
- future antibody / counterexample structures if promoted beyond observational evidence
- future multi-device or sympoietic work

## JSON remains appropriate for

- validation reports
- user-facing diagnostics exports
- bundle manifests intended for human review
- human-readable status artifacts

## Review rule

Any new internal surface that cannot be reasonably described as protobuf / type-directed must be reviewed before it is accepted.
