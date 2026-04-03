# File List for `new_instance.zip`

This is the curated file list for the other AI to collect into `new_instance.zip`.
Goal:
augment the transition context pack with real repo docs, validation reports, and scripts.
Do NOT include source/runtime implementation files unless explicitly noted.
Do include docs and scripts.
If a listed file does not exist, report it as missing rather than inventing it.

## Priority A — master context / doctrine / roadmap
1. docs/h3/H3_MASTER_PLAN_V3.md
2. docs/h3/H3_ARTIFICIAL_SURFACES_REGISTER.md
3. docs/h3/H3_DOCUMENTATION_RECOVERY_PLAN.md
4. docs/h3/H3_VALIDATION_GATES_GUIDE.md
5. docs/h3/H3_PROTOBUF_INTERNALS_NOTE.md
6. docs/h3/H3_RUNTIME_EVIDENCE_SCHEMA.md

## Priority B — stage 3D3 / 3E / 3F / 3G / 3H plans and reports
7. docs/h3/H3_STAGE3D3_PLAN.md
8. docs/h3/H3_STAGE3D3_VALIDATION_REPORT.md
9. docs/h3/H3_STAGE3E1_PLAN.md
10. docs/h3/H3_STAGE3E1_VALIDATION_REPORT.md
11. docs/h3/H3_STAGE3E2_PLAN.md
12. docs/h3/H3_STAGE3E2_VALIDATION_REPORT.md
13. docs/h3/H3_STAGE3F_PLAN.md
14. docs/h3/H3_STAGE3F_VALIDATION_REPORT.md
15. docs/h3/H3_STAGE3G_PLAN.md
16. docs/h3/H3_STAGE3G_STATUS_REPORT.md
17. docs/h3/H3_STAGE3G_VALIDATION_REPORT.md
18. docs/h3/H3_STAGE3H_PLAN.md
19. docs/h3/H3_STAGE3H_ARCHITECTURE.md
20. docs/h3/H3_HOMEOSTASIS_HPO_INTEGRATION.md
21. docs/h3/H3_DYNAMIC_PRECISION_REGIMES_NOTE.md

## Priority C — stage closure / evidence / status docs if present
22. docs/h3/H3_STAGE3E1_STATUS_REPORT.md
23. docs/h3/H3_STAGE3E2_STATUS_REPORT.md
24. docs/h3/H3_STAGE3F_STATUS_REPORT.md
25. docs/h3/H3_STAGE3H_STATUS_REPORT.md

## Priority D — research / integration docs already copied into repo if present
26. docs/h3/H3_RESEARCH_TO_ROADMAP_INTEGRATION.md
27. docs/h3/H3_CURRENT_STATE_AND_BASELINES.md
28. docs/h3/H3_ARTIFICIAL_SURFACES_POLICY.md
29. docs/h3/H3_KNOWN_INTEGRATION_ISSUES_AND_FIX_PATTERNS.md

## Priority E — scripts / utilities
30. scripts/h3_stage3d2_validate_timing.py
31. scripts/verify_stage_bundle_manifest.py
32. scripts/collect_h3_status.py
33. scripts/export_h3_docs_pack.py
34. scripts/h3_stage_report_helper.py

## Priority F — HPO / homeostasis / regime-adjacent test or script surfaces if present
35. maestro/client/src/test/audio/test-hpo-homeostasis-smoke.ts
36. maestro/client/src/test/audio/test-hpo-convergence.ts
37. maestro/client/src/test/audio/dynamic-precision-regimes.unit.spec.ts
38. maestro/client/src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts

## Priority G — 3G-specific test/docs surfaces if present
39. maestro/client/src/test/audio/counterfactual-repair-intelligence.unit.spec.ts
40. maestro/client/src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts

## Priority H — validation / manifest artifacts if preserved in repo or tmp and explicitly wanted
41. tmp/h3_stage3g_s5_repaired_bundle_20260403.zip
42. tmp/h3_stage3g_s4_repaired_bundle_20260403.zip
43. tmp/h3_stage3g_s3_repaired_bundle_20260403.zip
44. tmp/h3_stage3h_s1_bundle_20260403.zip

## Priority I — repo-level context docs if present
45. README.md
46. docs/README.md
47. docs/architecture/README.md
48. docs/operations/README.md
49. docs/contributors/README.md

## Priority J — optional but useful
50. package.json
51. tsconfig.json
52. maestro/client/package.json
53. maestro/client/tsconfig.json

Guidance:
- Keep the zip under control.
- Prefer docs and scripts first.
- Only include test files and config if they materially help the next instance resume.
- Do not exceed 80 items.
