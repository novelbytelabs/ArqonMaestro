import { normalizeNumericTail } from "../../main/stream/numeric-tail-normalizer";

describe("normalizeNumericTail", () => {
  it("normalizes numeric digits and spoken forms", () => {
    expect(normalizeNumericTail("52")).toMatchObject({
      status: "ok",
      normalized: "52",
    });
    expect(normalizeNumericTail("fifty two")).toMatchObject({
      status: "ok",
      normalized: "52",
    });
    expect(normalizeNumericTail("one hundred")).toMatchObject({
      status: "ok",
      normalized: "100",
    });
    expect(normalizeNumericTail("two hundred forty three")).toMatchObject({
      status: "ok",
      normalized: "243",
    });
    expect(normalizeNumericTail("one thousand")).toMatchObject({
      status: "ok",
      normalized: "1000",
    });
  });

  it("rejects empty, zero, and negative values", () => {
    expect(normalizeNumericTail("")).toMatchObject({
      status: "empty",
      normalized: null,
      reason: "numeric_tail_empty",
    });
    expect(normalizeNumericTail("0")).toMatchObject({
      status: "invalid",
      normalized: null,
      reason: "numeric_tail_must_be_positive_integer",
    });
    expect(normalizeNumericTail("-2")).toMatchObject({
      status: "invalid",
      normalized: null,
      reason: "numeric_tail_negative_not_allowed",
    });
    expect(normalizeNumericTail("negative two")).toMatchObject({
      status: "invalid",
      normalized: null,
      reason: "numeric_tail_negative_not_allowed",
    });
  });

  it("handles required partial-tail failure cases", () => {
    expect(normalizeNumericTail("one hun")).toMatchObject({
      status: "partial",
      normalized: null,
    });
    expect(normalizeNumericTail("fifty uh two")).toMatchObject({
      status: "invalid",
      normalized: null,
    });
    expect(normalizeNumericTail("two hundred and")).toMatchObject({
      status: "partial",
      normalized: null,
    });
    expect(normalizeNumericTail("zero")).toMatchObject({
      status: "invalid",
      normalized: null,
      reason: "numeric_tail_must_be_positive_integer",
    });
  });
});
