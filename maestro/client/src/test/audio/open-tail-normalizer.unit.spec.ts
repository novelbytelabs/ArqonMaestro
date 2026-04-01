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
});
