# new_instance apply notes

## Important context

- Pack assembled from exact requested paths only; no silent substitutions were made.
- Priority was docs/scripts first, with explicitly listed test/config surfaces included when present.
- Runtime/source implementation files were excluded unless explicitly listed.

## Stage docs missing from repo (per target list)

- `docs/h3/H3_MASTER_PLAN_V3.md`
- `docs/h3/H3_ARTIFICIAL_SURFACES_REGISTER.md`
- `docs/h3/H3_DOCUMENTATION_RECOVERY_PLAN.md`
- `docs/h3/H3_STAGE3G_VALIDATION_REPORT.md`
- `docs/h3/H3_STAGE3E1_STATUS_REPORT.md`
- `docs/h3/H3_STAGE3E2_STATUS_REPORT.md`
- `docs/h3/H3_STAGE3F_STATUS_REPORT.md`
- `docs/h3/H3_STAGE3H_STATUS_REPORT.md`
- `docs/h3/H3_RESEARCH_TO_ROADMAP_INTEGRATION.md`
- `docs/h3/H3_CURRENT_STATE_AND_BASELINES.md`
- `docs/h3/H3_ARTIFICIAL_SURFACES_POLICY.md`
- `docs/h3/H3_KNOWN_INTEGRATION_ISSUES_AND_FIX_PATTERNS.md`

## Branch inconsistencies

- Listed path missing: `docs/h3/H3_ARTIFICIAL_SURFACES_REGISTER.md`; similarly named file exists at `docs/H3_ARTIFICIAL_SURFACES_REGISTER.md` (not substituted).
- Listed path missing: `docs/h3/H3_DOCUMENTATION_RECOVERY_PLAN.md`; similarly named file exists at `docs/H3_DOCUMENTATION_RECOVERY_PLAN.md` (not substituted).
