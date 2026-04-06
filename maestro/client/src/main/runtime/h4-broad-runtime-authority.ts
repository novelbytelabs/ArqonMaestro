export interface H4AuthorityExpansionInputs {
    h4AuthoritySpineEligible?: boolean | null;
    h4AuthoritySpineAuthoritative?: boolean | null;
    h4AuthoritySpineCutoverActive?: boolean | null;
    workflowCandidateDiscoveryEligible?: boolean | null;
    workflowSkeletonInferenceEligible?: boolean | null;
    workflowCandidateScoringEligible?: boolean | null;
    workflowCandidateRubricEligible?: boolean | null;
    workflowCandidatePromotionEligible?: boolean | null;
    workflowDraftArtifactEligible?: boolean | null;
}

export interface H4AuthorityExpansionFields {
    h4AuthorityExpansionSchemaVersion: string | null;
    h4AuthorityExpansionPolicyVersion: string | null;
    h4AuthorityExpansionEligible: boolean | null;
    h4AuthorityExpansionPrimaryPath: string | null;
    h4AuthorityExpansionBroadRuntimeActive: boolean | null;
    h4AuthorityExpansionDiscoveryIntegrated: boolean | null;
    h4AuthorityExpansionSkeletonIntegrated: boolean | null;
    h4AuthorityExpansionScoringIntegrated: boolean | null;
    h4AuthorityExpansionRubricIntegrated: boolean | null;
    h4AuthorityExpansionPromotionIntegrated: boolean | null;
    h4AuthorityExpansionDraftPreviewIntegrated: boolean | null;
    h4AuthorityExpansionFallbackOnlySurfaces: string[] | null;
    h4AuthorityExpansionSource: string | null;
    h4AuthorityExpansionReasonCodes: string[] | null;
}

export const H4_AUTHORITY_EXPANSION_SCHEMA_VERSION = 'h4_authority_expansion_v1';
export const H4_AUTHORITY_EXPANSION_POLICY_VERSION = 'h4_broad_runtime_authority_expansion_v1';

export function buildH4AuthorityExpansionFields(
    inputs: H4AuthorityExpansionInputs,
): H4AuthorityExpansionFields {
    const authoritative = inputs.h4AuthoritySpineAuthoritative === true;
    const cutoverActive = inputs.h4AuthoritySpineCutoverActive === true;
    const eligible = inputs.h4AuthoritySpineEligible === true && authoritative && cutoverActive;

    if (!eligible) {
        return {
            h4AuthorityExpansionSchemaVersion: H4_AUTHORITY_EXPANSION_SCHEMA_VERSION,
            h4AuthorityExpansionPolicyVersion: H4_AUTHORITY_EXPANSION_POLICY_VERSION,
            h4AuthorityExpansionEligible: false,
            h4AuthorityExpansionPrimaryPath: 'h3j_command_lane_authority',
            h4AuthorityExpansionBroadRuntimeActive: false,
            h4AuthorityExpansionDiscoveryIntegrated: inputs.workflowCandidateDiscoveryEligible === true,
            h4AuthorityExpansionSkeletonIntegrated: inputs.workflowSkeletonInferenceEligible === true,
            h4AuthorityExpansionScoringIntegrated: inputs.workflowCandidateScoringEligible === true,
            h4AuthorityExpansionRubricIntegrated: inputs.workflowCandidateRubricEligible === true,
            h4AuthorityExpansionPromotionIntegrated: inputs.workflowCandidatePromotionEligible === true,
            h4AuthorityExpansionDraftPreviewIntegrated: inputs.workflowDraftArtifactEligible === true,
            h4AuthorityExpansionFallbackOnlySurfaces: ['broad_runtime_expansion'],
            h4AuthorityExpansionSource: 'h4_authority_expansion',
            h4AuthorityExpansionReasonCodes: ['authority_spine_not_yet_broad_runtime_active'],
        };
    }

    const discoveryIntegrated = inputs.workflowCandidateDiscoveryEligible === true;
    const skeletonIntegrated = inputs.workflowSkeletonInferenceEligible === true;
    const scoringIntegrated = inputs.workflowCandidateScoringEligible === true;
    const rubricIntegrated = inputs.workflowCandidateRubricEligible === true;
    const promotionIntegrated = inputs.workflowCandidatePromotionEligible === true;
    const draftPreviewIntegrated = inputs.workflowDraftArtifactEligible === true;

    const fallbackOnlySurfaces: string[] = [];
    if (!draftPreviewIntegrated) {
        fallbackOnlySurfaces.push('draft_artifacts');
    }

    return {
        h4AuthorityExpansionSchemaVersion: H4_AUTHORITY_EXPANSION_SCHEMA_VERSION,
        h4AuthorityExpansionPolicyVersion: H4_AUTHORITY_EXPANSION_POLICY_VERSION,
        h4AuthorityExpansionEligible: true,
        h4AuthorityExpansionPrimaryPath: 'h3j_command_lane_authority',
        h4AuthorityExpansionBroadRuntimeActive:
            discoveryIntegrated &&
            skeletonIntegrated &&
            scoringIntegrated &&
            rubricIntegrated &&
            promotionIntegrated,
        h4AuthorityExpansionDiscoveryIntegrated: discoveryIntegrated,
        h4AuthorityExpansionSkeletonIntegrated: skeletonIntegrated,
        h4AuthorityExpansionScoringIntegrated: scoringIntegrated,
        h4AuthorityExpansionRubricIntegrated: rubricIntegrated,
        h4AuthorityExpansionPromotionIntegrated: promotionIntegrated,
        h4AuthorityExpansionDraftPreviewIntegrated: draftPreviewIntegrated,
        h4AuthorityExpansionFallbackOnlySurfaces: fallbackOnlySurfaces,
        h4AuthorityExpansionSource: 'h4_authority_expansion',
        h4AuthorityExpansionReasonCodes: [
            'broad_runtime_authority_expansion_active',
            ...(draftPreviewIntegrated ? ['draft_preview_integration_present'] : ['draft_preview_not_yet_integrated']),
        ],
    };
}
