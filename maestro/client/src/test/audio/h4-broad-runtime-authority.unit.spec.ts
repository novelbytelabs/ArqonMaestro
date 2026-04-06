import { buildH4AuthorityExpansionFields } from '../../main/runtime/h4-broad-runtime-authority';

describe('H4 broad runtime authority expansion', () => {
    it('marks broad runtime authority active when the H3/3J stack is integrated under the authority spine', () => {
        const result = buildH4AuthorityExpansionFields({
            h4AuthoritySpineEligible: true,
            h4AuthoritySpineAuthoritative: true,
            h4AuthoritySpineCutoverActive: true,
            workflowCandidateDiscoveryEligible: true,
            workflowSkeletonInferenceEligible: true,
            workflowCandidateScoringEligible: true,
            workflowCandidateRubricEligible: true,
            workflowCandidatePromotionEligible: true,
            workflowDraftArtifactEligible: true,
        });

        expect(result.h4AuthorityExpansionEligible).toBe(true);
        expect(result.h4AuthorityExpansionBroadRuntimeActive).toBe(true);
        expect(result.h4AuthorityExpansionPrimaryPath).toBe('h3j_command_lane_authority');
    });

    it('keeps broad runtime expansion fallback-only when the authority spine is not yet eligible', () => {
        const result = buildH4AuthorityExpansionFields({
            h4AuthoritySpineEligible: false,
            h4AuthoritySpineAuthoritative: false,
            h4AuthoritySpineCutoverActive: false,
            workflowCandidateDiscoveryEligible: true,
        });

        expect(result.h4AuthorityExpansionEligible).toBe(false);
        expect(result.h4AuthorityExpansionFallbackOnlySurfaces).toContain('broad_runtime_expansion');
    });
});
