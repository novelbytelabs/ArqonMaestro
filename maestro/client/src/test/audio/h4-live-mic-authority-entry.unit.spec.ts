import { deriveH4AuthorityEntryObservation } from "../../main/runtime/h4-live-mic-authority-entry";

describe("H4 live mic authority entry", () => {
  it("selects h3j authority as the default live command-lane path", () => {
    const fields = deriveH4AuthorityEntryObservation({
      liveMicActive: true,
      streamConnected: true,
      dictateMode: false,
      forceLegacyCommandLane: false,
      h3AuthorityEnabled: true,
    });

    expect(fields).toEqual(expect.objectContaining({
      h4AuthorityEntrySchemaVersion: "h4_authority_entry_v1",
      h4AuthorityEntryPolicyVersion: "h4_live_mic_entry_integration_v1",
      h4AuthorityEntryEligible: true,
      h4AuthorityEntryCommandLane: true,
      h4AuthorityEntryDefaultPath: "h3j_authority",
      h4AuthorityEntryAuthoritative: true,
      h4AuthorityEntryFallbackInvoked: false,
    }));
  });

  it("marks explicit fallback when the authority path fails to produce a lawful final decision", () => {
    const fields = deriveH4AuthorityEntryObservation({
      liveMicActive: true,
      streamConnected: true,
      dictateMode: false,
      forceLegacyCommandLane: false,
      h3AuthorityEnabled: true,
      fallbackInvoked: true,
      fallbackReason: "authoritative_path_failed_to_produce_lawful_final_decision",
    });

    expect(fields).toEqual(expect.objectContaining({
      h4AuthorityEntryDefaultPath: "h3j_authority",
      h4AuthorityEntryFallbackAllowed: true,
      h4AuthorityEntryFallbackInvoked: true,
      h4AuthorityEntryFallbackReason: "authoritative_path_failed_to_produce_lawful_final_decision",
    }));
  });
});
