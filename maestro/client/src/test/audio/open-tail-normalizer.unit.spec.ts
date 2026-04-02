import { normalizeOpenTail } from "../../main/stream/open-tail-normalizer";

describe("normalizeOpenTail", () => {
  it("normalizes clearly domain-like patterns into dotted domains", () => {
    expect(normalizeOpenTail("wikipedia dot org")).toMatchObject({
      status: "ok",
      normalized: "wikipedia.org",
      targetKind: "domain",
    });
    expect(normalizeOpenTail("developer dot mozilla dot org")).toMatchObject({
      status: "ok",
      normalized: "developer.mozilla.org",
      targetKind: "domain",
    });
    expect(normalizeOpenTail("github.com")).toMatchObject({
      status: "ok",
      normalized: "github.com",
      targetKind: "domain",
    });
  });

  it("keeps text targets as text when not clearly domain-like", () => {
    expect(normalizeOpenTail("stack overflow")).toMatchObject({
      status: "ok",
      normalized: "stack overflow",
      targetKind: "text",
    });
    expect(normalizeOpenTail("open ai docs")).toMatchObject({
      status: "ok",
      normalized: "open ai docs",
      targetKind: "text",
    });
  });

  it("rejects missing or malformed open tails", () => {
    expect(normalizeOpenTail("")).toMatchObject({
      status: "empty",
      normalized: null,
    });
    expect(normalizeOpenTail("uh")).toMatchObject({
      status: "invalid",
      normalized: null,
      reason: "open_tail_filler_only",
    });
    expect(normalizeOpenTail("maybe")).toMatchObject({
      status: "invalid",
      normalized: null,
      reason: "open_tail_ambiguous_target",
    });
    expect(normalizeOpenTail("and")).toMatchObject({
      status: "invalid",
      normalized: null,
      reason: "open_tail_connector_only",
    });
  });

  it("keeps domain normalization conservative and classifies invalid domain-like tails", () => {
    expect(normalizeOpenTail("github dot")).toMatchObject({
      status: "invalid",
      normalized: null,
      targetKind: "domain",
      reason: "open_tail_domain_pattern_invalid",
    });
    expect(normalizeOpenTail("docs python")).toMatchObject({
      status: "ok",
      normalized: "docs python",
      targetKind: "text",
    });
  });

  it("rejects app-like ambiguous tails for open-target strategy", () => {
    expect(normalizeOpenTail("stack over", { commandPrefix: "open" })).toMatchObject({
      status: "partial",
      normalized: null,
      targetKind: "text",
      reason: "open_tail_app_like_ambiguous_partial",
    });
    expect(normalizeOpenTail("set things", { commandPrefix: "open" })).toMatchObject({
      status: "partial",
      normalized: null,
      targetKind: "text",
      reason: "open_tail_app_like_ambiguous_partial",
    });
    // Same phrase remains allowed outside open-target strict mode.
    expect(normalizeOpenTail("stack over", { commandPrefix: "go to" })).toMatchObject({
      status: "ok",
      normalized: "stack over",
      targetKind: "text",
    });
  });
});
