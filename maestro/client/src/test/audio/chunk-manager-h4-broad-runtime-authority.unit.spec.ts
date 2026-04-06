export {};

const cfhMockFactory = () => ({
  SIG_BYTES: 128,
  SIG_U64S: 16,
  SplitMix64: class {
    nextU64() { return BigInt(0); }
    nextF32Signed() { return 0; }
  },
  normalizeCanonical: () => [],
  normalizeQuery: (q: string) => q,
  generateSignatureBytes: () => new Uint8Array(128),
  sigBytesToU64x16: () => new Array(16).fill(BigInt(0)),
  cfhScoreU64x16: () => 0,
  bucketFromSig: () => 0,
});

describe('ChunkManager H4 broad runtime authority evidence', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.unmock('../../main/stt/cfh');
    });
    afterEach(() => {
        jest.unmock('../../main/stt/cfh');
        jest.restoreAllMocks();
        jest.clearAllMocks();
        jest.resetModules();
    });

    it('emits explicit broad runtime authority fields when the authority spine and H3/3J surfaces are integrated', () => {
        let getH4AuthorityExpansionFields: any;
        jest.isolateModules(() => {
            jest.doMock('../../main/stt/cfh', cfhMockFactory);
            getH4AuthorityExpansionFields =
                require('../../main/stream/chunk-manager.ts').getH4AuthorityExpansionFields;
        });
        const result = getH4AuthorityExpansionFields({
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
        expect(result.h4AuthorityExpansionDraftPreviewIntegrated).toBe(true);
    });
});
