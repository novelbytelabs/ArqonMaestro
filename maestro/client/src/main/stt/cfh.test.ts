/**
 * CFH Tests and Parity Fixtures
 * 
 * This file contains:
 * 1. Unit tests for the CFH implementation
 * 2. Fixture generation for TS/Rust parity testing
 */

import {
  normalizeCanonical,
  normalizeQuery,
  generateSignatureBytes,
  sigBytesToU64x16,
  cfhScoreU64x16,
  bucketFromSig,
  SIG_BYTES,
  SIG_U64S
} from "./cfh";

// ============================================================================
// Test Fixtures
// ============================================================================

interface Fixture {
  input: string;
  description: string;
}

const PARITY_FIXTURES: Fixture[] = [
  // Basic cases
  { input: "test query", description: "basic lowercase" },
  { input: "TEST QUERY", description: "basic uppercase" },
  { input: "Test Query", description: "mixed case" },
  { input: "  Hello   WORLD  ", description: "whitespace variants" },
  
  // Punctuation
  { input: "what is the policy for pii?", description: "trailing punctuation" },
  { input: "what is the policy for pii!?", description: "multiple punctuation" },
  { input: "hello, world!", description: "punctuation middle" },
  { input: "don't stop", description: "apostrophe" },
  { input: "email test@example.com", description: "email address" },
  
  // Unicode
  { input: "café", description: "unicode accent" },
  { input: "naïve", description: "unicode diaeresis" },
  { input: "日本語", description: "japanese" },
  { input: "🎉 party", description: "emoji" },
  
  // Empty-like
  { input: "", description: "empty string" },
  { input: "   ", description: "whitespace only" },
  { input: "a", description: "single char" },
  { input: "a b c", description: "single char tokens" },
  
  // Numbers
  { input: "doc 10", description: "number" },
  { input: "doc 72", description: "number different" },
  { input: "version 1.2.3", description: "version string" },
  
  // Stopwords
  { input: "the quick brown fox", description: "stopwords" },
  { input: "a an and are as at", description: "all stopwords" },
  
  // Stemming
  { input: "running", description: "stem ing" },
  { input: "installation", description: "stem tion" },
  { input: "happiness", description: "stem ness" },
  { input: "applied", description: "stem ed" },
  { input: "quickly", description: "stem ly" },
  
  // Morphological
  { input: "testing", description: "morphological 1" },
  { input: "tested", description: "morphological 2" },
  { input: "tests", description: "morphological 3" },
  
  // Edge cases
  { input: "!@#$%^&*()", description: "special chars only" },
  { input: "hello\x00world", description: "null byte" },
  { input: "tab\there", description: "tab character" },
  { input: "line1\nline2", description: "newline" },
  
  // Paraphrase test cases
  { input: "can you tell me the pii rules?", description: "paraphrase of policy" },
  { input: "what is the weather in london?", description: "semantic swap" },
];

// ============================================================================
// Test Functions
// ============================================================================

function runTests(): void {
  let passed = 0;
  let failed = 0;

  console.log("=== CFH Unit Tests ===\n");

  // Test 1: normalizeQuery
  console.log("Test 1: normalizeQuery");
  {
    const result = normalizeQuery("  Hello   WORLD  ");
    const expected = "hello world";
    if (result === expected) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: got "${result}", expected "${expected}"`);
      failed++;
    }
  }

  // Test 2: normalizeQuery 2
  console.log("Test 2: normalizeQuery (2)");
  {
    const result = normalizeQuery("Test");
    const expected = "test";
    if (result === expected) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: got "${result}", expected "${expected}"`);
      failed++;
    }
  }

  // Test 3: Signature deterministic
  console.log("Test 3: Signature deterministic");
  {
    const sig1 = generateSignatureBytes("test query", 128);
    const sig2 = generateSignatureBytes("test query", 128);
    const isEqual = Array.from(sig1).every((v, i) => v === sig2[i]);
    if (sig1.length === 128 && isEqual) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: length=${sig1.length}, deterministic=${isEqual}`);
      failed++;
    }
  }

  // Test 4: Score identical
  console.log("Test 4: Score identical");
  {
    const sig = generateSignatureBytes("test", 128);
    const u64Sig = sigBytesToU64x16(sig);
    const score = cfhScoreU64x16(u64Sig, u64Sig);
    if (Math.abs(score - 1.0) < 0.001) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: score=${score}, expected 1.0`);
      failed++;
    }
  }

  // Test 5: Locality sensitivity (typo)
  console.log("Test 5: Locality sensitivity (typo)");
  {
    const sig1 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii?", 128));
    const sig2 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii!?", 128));
    const score = cfhScoreU64x16(sig1, sig2);
    if (score > 0.9) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: score=${score}, expected > 0.9`);
      failed++;
    }
  }

  // Test 6: Locality sensitivity (paraphrase)
  console.log("Test 6: Locality sensitivity (paraphrase)");
  {
    const sig1 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii?", 128));
    const sig2 = sigBytesToU64x16(generateSignatureBytes("can you tell me the pii rules?", 128));
    const score = cfhScoreU64x16(sig1, sig2);
    if (score > 0.58) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: score=${score}, expected > 0.58`);
      failed++;
    }
  }

  // Test 7: Locality sensitivity (semantic swap)
  console.log("Test 7: Locality sensitivity (semantic swap)");
  {
    const sig1 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii?", 128));
    const sig2 = sigBytesToU64x16(generateSignatureBytes("what is the weather in london?", 128));
    const score = cfhScoreU64x16(sig1, sig2);
    if (score < 0.65) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: score=${score}, expected < 0.65`);
      failed++;
    }
  }

  // Test 8: normalizeCanonical
  console.log("Test 8: normalizeCanonical");
  {
    const tokens = normalizeCanonical("What is the POLICY for PII?");
    if (tokens.includes("what") && tokens.includes("policy") && tokens.includes("pii")) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: got [${tokens.join(", ")}]`);
      failed++;
    }
  }

  // Test 9: Soundex preservation of numeric tokens
  console.log("Test 9: Soundex preserves numeric tokens");
  {
    const tokens1 = normalizeCanonical("doc 10");
    const tokens2 = normalizeCanonical("doc 72");
    // They should NOT collapse to same token
    const isDifferent = JSON.stringify(tokens1) !== JSON.stringify(tokens2);
    if (isDifferent) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: "doc 10" and "doc 72" should not collapse`);
      failed++;
    }
  }

  // Test 10: Empty input
  console.log("Test 10: Empty input");
  {
    const sig = generateSignatureBytes("", 128);
    if (sig.length === 128) {
      console.log("  ✓ Pass");
      passed++;
    } else {
      console.log(`  ✗ Fail: length=${sig.length}`);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
}

// ============================================================================
// Fixture Generation for Parity
// ============================================================================

function generateFixtures(): void {
  console.log("=== Generating Parity Fixtures ===\n");
  
  const fixtures: Array<{
    input: string;
    description: string;
    normalized: string[];
    signature: string;
  }> = [];

  for (const fixture of PARITY_FIXTURES) {
    const normalized = normalizeCanonical(fixture.input);
    const sig = generateSignatureBytes(fixture.input, 128);
    const sigHex = Buffer.from(sig).toString("hex");
    
    fixtures.push({
      input: fixture.input,
      description: fixture.description,
      normalized,
      signature: sigHex
    });
  }

  // Output as JSON for comparison with Rust
  console.log("JSON Output (for Rust comparison):");
  console.log(JSON.stringify(fixtures, null, 2));
}

// ============================================================================
// Run Tests
// ============================================================================

if (require.main === module) {
  runTests();
  generateFixtures();
}

export { PARITY_FIXTURES, runTests, generateFixtures };
export type { Fixture };
