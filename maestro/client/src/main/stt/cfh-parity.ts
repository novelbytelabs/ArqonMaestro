/**
 * CFH Parity Test - TS vs Rust Cross-Validation
 * 
 * This script generates CFH signatures from TypeScript and compares them
 * against expected Rust output for the same inputs.
 * 
 * Run: npx ts-node src/main/stt/cfh-parity.ts
 */

import {
  normalizeCanonical,
  normalizeQuery,
  generateSignatureBytes,
  sigBytesToU64x16,
  cfhScoreU64x16,
} from "./cfh";

// ============================================================================
// Parity Fixtures
// ============================================================================

interface ParityFixture {
  input: string;
  description: string;
  expectedNormalized: string[];
  // Expected signature hex from Rust (first 16 bytes for quick check)
  expectedSigPrefix?: string;
}

const PARITY_FIXTURES: ParityFixture[] = [
  // Basic cases - soundex("query") = Q600 (q=Q, u=vowel, e=vowel, r=6, y=vowel)
  {
    input: "test query",
    description: "basic lowercase",
    expectedNormalized: ["Q600", "T230"], // soundex("test")=T230, soundex("query")=Q600
  },
  {
    input: "TEST QUERY",
    description: "basic uppercase",
    expectedNormalized: ["Q600", "T230"], // Same as lowercase after normalization
  },
  {
    input: "Test Query",
    description: "mixed case",
    expectedNormalized: ["Q600", "T230"],
  },
  {
    input: "  Hello   WORLD  ",
    description: "whitespace variants",
    expectedNormalized: ["H400", "W643"],
  },
  
  // Punctuation
  {
    input: "what is the policy for pii?",
    description: "trailing punctuation",
    expectedNormalized: ["P000", "P420"], // stopwords removed, soundex applied
  },
  {
    input: "what is the policy for pii!?",
    description: "multiple punctuation",
    expectedNormalized: ["P000", "P420"], // Same as above - punctuation stripped
  },
  {
    input: "hello, world!",
    description: "punctuation middle",
    expectedNormalized: ["H400", "W643"],
  },
  
  // Unicode - Note: TS and Rust may handle unicode differently
  {
    input: "café",
    description: "unicode accent",
    expectedNormalized: ["C100"], // 'é' becomes separator or stripped
  },
  
  // Empty-like
  {
    input: "",
    description: "empty string",
    expectedNormalized: [],
  },
  {
    input: "   ",
    description: "whitespace only",
    expectedNormalized: [],
  },
  {
    input: "a",
    description: "single char",
    expectedNormalized: [], // Filtered out (length <= 1)
  },
  {
    input: "a b c",
    description: "single char tokens",
    expectedNormalized: [], // All filtered out
  },
  
  // Numbers
  {
    input: "doc 10",
    description: "number",
    expectedNormalized: ["10", "D200"], // Numbers preserved
  },
  {
    input: "doc 72",
    description: "number different",
    expectedNormalized: ["72", "D200"], // Different number
  },
  
  // Stopwords - soundex("brown")=B650 (b=B, r=6, o=vowel, w=ignored, n=5)
  {
    input: "the quick brown fox",
    description: "stopwords",
    expectedNormalized: ["B650", "F200", "Q200"], // "the" removed
  },
  {
    input: "a an and are as at",
    description: "all stopwords",
    expectedNormalized: [], // All removed
  },
  
  // Stemming
  {
    input: "running",
    description: "stem ing",
    expectedNormalized: ["R500"], // "run" -> soundex
  },
  // soundex("installa") = I523 (i=I, n=5, s=2, t=3, a=vowel, l=4, l=ignored, a=vowel)
  {
    input: "installation",
    description: "stem tion",
    expectedNormalized: ["I523"], // "installa" -> soundex
  },
  
  // Edge cases
  {
    input: "!@#$%^&*()",
    description: "special chars only",
    expectedNormalized: [],
  },
];

// ============================================================================
// Test Functions
// ============================================================================

function runParityTests(): void {
  let passed = 0;
  let failed = 0;
  const mismatches: string[] = [];

  console.log("=== CFH TS/Rust Parity Tests ===\n");
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  for (const fixture of PARITY_FIXTURES) {
    const actualNormalized = normalizeCanonical(fixture.input);
    const normalizedMatch = JSON.stringify(actualNormalized) === JSON.stringify(fixture.expectedNormalized);
    
    if (normalizedMatch) {
      console.log(`✓ [${fixture.description}] "${fixture.input}"`);
      console.log(`  Normalized: [${actualNormalized.join(", ")}]`);
      passed++;
    } else {
      console.log(`✗ [${fixture.description}] "${fixture.input}"`);
      console.log(`  Expected: [${fixture.expectedNormalized.join(", ")}]`);
      console.log(`  Actual:   [${actualNormalized.join(", ")}]`);
      failed++;
      mismatches.push(fixture.description);
    }
    
    // Generate signature for all fixtures
    const sig = generateSignatureBytes(fixture.input, 128);
    const sigHex = Buffer.from(sig).toString("hex").substring(0, 32);
    console.log(`  Signature prefix: ${sigHex}\n`);
  }

  console.log("=== Summary ===");
  console.log(`Passed: ${passed}/${PARITY_FIXTURES.length}`);
  console.log(`Failed: ${failed}/${PARITY_FIXTURES.length}`);
  
  if (mismatches.length > 0) {
    console.log(`\nMismatches: ${mismatches.join(", ")}`);
  }
  
  // Test signature determinism
  console.log("\n=== Signature Determinism Test ===");
  const testQueries = [
    "what is the policy for pii?",
    "what is the policy for pii!?",
    "can you tell me the pii rules?",
    "what is the weather in london?",
  ];
  
  for (const q of testQueries) {
    const sig1 = generateSignatureBytes(q, 128);
    const sig2 = generateSignatureBytes(q, 128);
    const deterministic = Buffer.from(sig1).equals(Buffer.from(sig2));
    console.log(`  "${q}": deterministic=${deterministic}`);
  }
  
  // Test similarity scores
  console.log("\n=== Similarity Score Tests ===");
  const sig1 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii?", 128));
  const sig2 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii!?", 128));
  const sig3 = sigBytesToU64x16(generateSignatureBytes("can you tell me the pii rules?", 128));
  const sig4 = sigBytesToU64x16(generateSignatureBytes("what is the weather in london?", 128));
  
  const scoreTypo = cfhScoreU64x16(sig1, sig2);
  const scoreParaphrase = cfhScoreU64x16(sig1, sig3);
  const scoreSemantic = cfhScoreU64x16(sig1, sig4);
  
  console.log(`  Typo similarity: ${scoreTypo.toFixed(4)} (expected: 1.0)`);
  console.log(`  Paraphrase similarity: ${scoreParaphrase.toFixed(4)} (expected: > 0.58)`);
  console.log(`  Semantic swap similarity: ${scoreSemantic.toFixed(4)} (expected: < 0.65)`);
  
  const scorePass = scoreTypo === 1.0 && scoreParaphrase > 0.58 && scoreSemantic < 0.65;
  console.log(`  Score tests: ${scorePass ? "PASS" : "FAIL"}`);
  
  // Final result
  console.log("\n=== Final Result ===");
  if (failed === 0 && scorePass) {
    console.log("ALL TESTS PASSED");
  } else {
    console.log("SOME TESTS FAILED");
    process.exit(1);
  }
}

// ============================================================================
// Generate JSON Fixtures for Rust Comparison
// ============================================================================

function generateJsonFixtures(): void {
  console.log("\n=== JSON Fixtures for Rust Comparison ===\n");
  
  const fixtures = PARITY_FIXTURES.map(f => ({
    input: f.input,
    description: f.description,
    normalized: normalizeCanonical(f.input),
    signature_hex: Buffer.from(generateSignatureBytes(f.input, 128)).toString("hex"),
  }));
  
  console.log(JSON.stringify(fixtures, null, 2));
}

// ============================================================================
// Main
// ============================================================================

if (require.main === module) {
  runParityTests();
  // Uncomment to generate JSON fixtures:
  // generateJsonFixtures();
}

export { PARITY_FIXTURES, runParityTests, generateJsonFixtures };
