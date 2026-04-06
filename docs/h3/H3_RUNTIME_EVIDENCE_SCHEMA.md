# H3 Runtime Evidence Schema

## H4-S4 bounded additions

This docs-only patch records the bounded `h4AuthorityExpansion*` family added for Stage `H4-S4`.

New fields:

- `h4AuthorityExpansionSchemaVersion`
- `h4AuthorityExpansionPolicyVersion`
- `h4AuthorityExpansionEligible`
- `h4AuthorityExpansionPrimaryPath`
- `h4AuthorityExpansionBroadRuntimeActive`
- `h4AuthorityExpansionDiscoveryIntegrated`
- `h4AuthorityExpansionSkeletonIntegrated`
- `h4AuthorityExpansionScoringIntegrated`
- `h4AuthorityExpansionRubricIntegrated`
- `h4AuthorityExpansionPromotionIntegrated`
- `h4AuthorityExpansionDraftPreviewIntegrated`
- `h4AuthorityExpansionFallbackOnlySurfaces`
- `h4AuthorityExpansionSource`
- `h4AuthorityExpansionReasonCodes`

Meaning:

These fields make broader runtime authority expansion explicit once H4 authority spine cutover is active. They do not add UX/UI, execution semantics, or persistent storage.

Stage posture:

- H4-S2 made live mic entry explicit
- H4-S3 made command-lane authority spine explicit
- H4-S4 broadens explicit authority across the H3/3J runtime surfaces
