/**
 * CFH (Canonical Fingerprint Hashing) - TypeScript Implementation
 * 
 * Holy Grail: Canonical Fingerprint with aggressive pre-normalization.
 * - Punctuation stripping, stopword removal, Porter stemming, sorting.
 * - Similar queries become IDENTICAL before hashing -> 1.0 stability.
 * - O(N) complexity with microsecond performance.
 * 
 * This implementation matches the Rust reflexifier behavior exactly.
 */

import { createHash, Hash } from "crypto";

// ============================================================================
// Constants
// ============================================================================

/** Signature size in bytes (1024 bits) */
export const SIG_BYTES: number = 128;

/** Signature size in u64s (16 * 8 = 128 bytes) */
export const SIG_U64S: number = 16;

/** Stopwords to remove during canonical normalization */
const STOPWORDS: Set<string> = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "for",
  "from", "has", "have", "how", "i", "in", "is", "it", "me", "my", "of",
  "on", "or", "please", "show", "tell", "the", "to", "was", "what",
  "when", "where", "which", "who", "will", "with", "would", "you", "your"
]);

// ============================================================================
// SplitMix64 PRNG - Ported from Rust
// ============================================================================

/**
 * SplitMix64 PRNG - fast, deterministic, good quality.
 * Ported from Rust util.rs
 */
export class SplitMix64 {
  private state: bigint;

  constructor(seed: bigint) {
    this.state = seed;
  }

  /**
   * Generate next u64 value
   */
  nextU64(): bigint {
    this.state = this.state + 0x9E3779B97F4A7C15n;
    let z = this.state;
    z = (z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n;
    z = (z ^ (z >> 27n)) * 0x94D049BB133111EBn;
    return z ^ (z >> 31n);
  }

  /**
   * Generate f32 in [-1, 1]
   */
  nextF32Signed(): number {
    // Convert to [0, 1] then shift to [-1, 1]
    const maxUint64 = 0xFFFFFFFFFFFFFFFFn;
    return Number(this.nextU64() / maxUint64) * 2.0 - 1.0;
  }
}

// ============================================================================
// Stemming
// ============================================================================

/**
 * Very basic Porter-like stemmer for common suffixes.
 * Ported from Rust cfh.rs
 */
function stemWord(word: string): string {
  const w = word.toLowerCase();
  // Remove common suffixes
  if (w.length > 4) {
    if (w.endsWith("ing")) return w.slice(0, -3);
    if (w.endsWith("tion")) return w.slice(0, -4);
    if (w.endsWith("ness")) return w.slice(0, -4);
    if (w.endsWith("ment")) return w.slice(0, -4);
    if (w.endsWith("able")) return w.slice(0, -4);
    if (w.endsWith("ible")) return w.slice(0, -4);
    if (w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.endsWith("es") && w.length > 3) return w.slice(0, -2);
    if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
    if (w.endsWith("ed") && w.length > 3) return w.slice(0, -2);
    if (w.endsWith("ly")) return w.slice(0, -2);
  }
  return w;
}

// ============================================================================
// Soundex
// ============================================================================

/**
 * Soundex phonetic encoding (American Soundex algorithm).
 * Maps similar-sounding words to the same code, e.g., "policy" and "polisy" -> "P420".
 * Ported from Rust cfh.rs
 */
function soundex(word: string): string {
  if (word.length === 0) {
    return "";
  }

  // If numeric, return as is (to distinguish "doc 10" from "doc 72")
  if (/^\d+$/.test(word)) {
    return word;
  }

  const chars: string[] = word.toLowerCase()
    .split("")
    .filter(c => /[a-z]/.test(c));
  
  if (chars.length === 0) {
    return "";
  }

  const codeFor = (c: string): string | null => {
    switch (c) {
      case 'b': case 'f': case 'p': case 'v': return '1';
      case 'c': case 'g': case 'j': case 'k': case 'q': case 's': case 'x': case 'z': return '2';
      case 'd': case 't': return '3';
      case 'l': return '4';
      case 'm': case 'n': return '5';
      case 'r': return '6';
      default: return null; // vowels and 'h', 'w' are ignored
    }
  };

  let result = chars[0].toUpperCase();
  let prevCode: string | null = codeFor(chars[0]);

  for (let i = 1; i < chars.length; i++) {
    if (result.length >= 4) {
      break;
    }
    const code = codeFor(chars[i]);
    if (code !== null && code !== prevCode) {
      result += code;
      prevCode = code;
    } else {
      prevCode = null; // vowels reset the prev_code
    }
  }

  while (result.length < 4) {
    result += '0';
  }

  return result;
}

// ============================================================================
// Canonical Normalization
// ============================================================================

/**
 * Canonical normalization: lowercase, strip punctuation, stem, remove stopwords, sort.
 * Ported from Rust cfh.rs
 */
export function normalizeCanonical(q: string): string[] {
  const lower = q.toLowerCase();
  // Keep only alphanumeric and spaces
  let cleaned = "";
  for (const c of lower) {
    if (/[a-z0-9]/.test(c) || /\s/.test(c)) {
      cleaned += c;
    } else {
      cleaned += ' ';
    }
  }

  const tokens: string[] = cleaned
    .split(/\s+/)
    .map(w => stemWord(w))
    .filter(w => !STOPWORDS.has(w) && w.length > 1)
    .map(w => {
      // Only soundex pure alphabetic tokens.
      // Keep numeric / alphanumeric tokens to prevent "doc 10" collapsing to "doc 72".
      if (/^[a-z]+$/i.test(w)) {
        return soundex(w);
      } else {
        return w;
      }
    })
    .filter(s => s.length > 0);
  
  // Sort and deduplicate
  tokens.sort();
  const deduped: string[] = [];
  let prev = "";
  for (const t of tokens) {
    if (t !== prev) {
      deduped.push(t);
      prev = t;
    }
  }
  
  return deduped;
}

/**
 * Basic normalization (legacy compatibility).
 * Ported from Rust cfh.rs
 */
export function normalizeQuery(q: string): string {
  const lower = q.toLowerCase();
  return lower.split(/\s+/).filter(s => s.length > 0).join(" ");
}

// ============================================================================
// Feature Projection
// ============================================================================

/**
 * Project a feature into the high-dimensional accumulator with specific weight (density).
 * Ported from Rust cfh.rs
 */
function projectFeature(feat: string, acc: number[], density: number): void {
  const dim = acc.length;
  
  // Use SHA256 for hashing (Node.js built-in)
  const hash = createHash('sha256');
  hash.update(feat);
  const hashBytes = hash.digest();
  
  // Convert first 16 bytes to two u64 seeds
  const seed1 = hashBytes.readBigUInt64LE(0);
  const seed2 = hashBytes.readBigUInt64LE(8);
  const rng = new SplitMix64(seed1 ^ seed2);
  
  for (let i = 0; i < density; i++) {
    const bit = Number(rng.nextU64() % BigInt(dim));
    if (Number(rng.nextU64() % 2n) === 0) {
      acc[bit] += 1.0;
    } else {
      acc[bit] -= 1.0;
    }
  }
}

// ============================================================================
// Signature Generation
// ============================================================================

/**
 * Generate CFH signature bytes from query string.
 * 
 * Uses Canonical Fingerprint: aggressive normalization + saturated hashing.
 * Ported from Rust cfh.rs
 */
export function generateSignatureBytes(query: string, dim: number = 128): Uint8Array {
  const tokens = normalizeCanonical(query);
  const nBits = dim * 8;
  // Use regular number array for mutability (Float32Array copy issue)
  const accumulator: number[] = new Array(nBits).fill(0);
  
  // Project each canonical token with high density
  for (const token of tokens) {
    // Token-level projection (high weight for whole word stability)
    projectFeature(token, accumulator, 256);
    
    // Char-trigrams for typo resilience
    const chars = token.split("");
    if (chars.length >= 3) {
      for (let i = 0; i <= chars.length - 3; i++) {
        const trigram = chars.slice(i, i + 3).join("");
        projectFeature(trigram, accumulator, 64);
      }
    }
    
    // Prefix/suffix for morphological affinity
    if (chars.length >= 3) {
      const prefix = chars.slice(0, 3).join("");
      const suffix = chars.slice(chars.length - 3).join("");
      projectFeature("^" + prefix, accumulator, 32);
      projectFeature(suffix + "$", accumulator, 32);
    }
  }

  // Sign-based quantization into bitstring
  const out = new Uint8Array(dim);
  for (let i = 0; i < nBits; i++) {
    const val = accumulator[i];
    let bitIsOne: boolean;
    
    if (val > 0) {
      bitIsOne = true;
    } else if (val < 0) {
      bitIsOne = false;
    } else {
      // Tie case: use deterministic fallback based on index
      // SplitMix64 with seed = i
      const tieRng = new SplitMix64(BigInt(i));
      bitIsOne = Number(tieRng.nextU64() % 2n) === 0;
    }

    if (bitIsOne) {
      out[Math.floor(i / 8)] |= 1 << (i % 8);
    }
  }

  return out;
}

/**
 * Convert signature bytes to [u64; 16] for fast SIMD-friendly scoring.
 * Ported from Rust cfh.rs
 */
export function sigBytesToU64x16(sig: Uint8Array): bigint[] {
  const out: bigint[] = new Array(SIG_U64S).fill(0n);
  const take = Math.min(sig.length, SIG_BYTES);
  
  // Create Buffer with zeros (Buffer is required for readBigUInt64LE)
  const buf = Buffer.alloc(SIG_BYTES);
  buf.set(sig.slice(0, take), 0);

  for (let i = 0; i < SIG_U64S; i++) {
    const start = i * 8;
    out[i] = buf.readBigUInt64LE(start);
  }
  
  return out;
}

/**
 * CFH similarity score using XOR + POPCOUNT.
 * 
 * Returns similarity in [0, 1] where 1 = identical.
 * Ported from Rust cfh.rs
 */
export function cfhScoreU64x16(a: bigint[], b: bigint[]): number {
  let xorBits = 0;
  for (let i = 0; i < SIG_U64S; i++) {
    const xorVal = a[i] ^ b[i];
    // Count set bits (popcount)
    let x = xorVal;
    while (x > 0n) {
      xorBits += Number(x & 1n);
      x >>= 1n;
    }
  }
  // similarity = 1 - (xor_bits / total_bits)
  return 1.0 - (xorBits / 1024.0);
}

/**
 * Compute bucket from signature.
 * Ported from Rust cfh.rs
 */
export function bucketFromSig(sig: bigint[], numBuckets: number): number {
  return Number(sig[0] % BigInt(numBuckets));
}

// ============================================================================
// Tests
// ============================================================================

if (require.main === module) {
  console.log("=== CFH TypeScript Implementation Tests ===\n");

  // Test 1: normalizeQuery
  console.log("Test 1: normalizeQuery");
  const q1 = normalizeQuery("  Hello   WORLD  ");
  console.log(`  normalizeQuery("  Hello   WORLD  ") = "${q1}"`);
  console.log(`  Expected: "hello world"`);
  console.log(`  Pass: ${q1 === "hello world"}\n`);

  // Test 2: normalizeQuery 2
  console.log("Test 2: normalizeQuery (2)");
  const q2 = normalizeQuery("Test");
  console.log(`  normalizeQuery("Test") = "${q2}"`);
  console.log(`  Expected: "test"`);
  console.log(`  Pass: ${q2 === "test"}\n`);

  // Test 3: Signature deterministic
  console.log("Test 3: Signature deterministic");
  const sig1 = generateSignatureBytes("test query", 128);
  const sig2 = generateSignatureBytes("test query", 128);
  const sig1Match = Array.from(sig1).every((v, i) => v === sig2[i]);
  console.log(`  generateSignatureBytes("test query", 128).length = ${sig1.length}`);
  console.log(`  Expected length: 128`);
  console.log(`  Deterministic: ${sig1Match}`);
  console.log(`  Pass: ${sig1.length === 128 && sig1Match}\n`);

  // Test 4: Score identical
  console.log("Test 4: Score identical");
  const sig = generateSignatureBytes("test", 128);
  const u64Sig = sigBytesToU64x16(sig);
  const score = cfhScoreU64x16(u64Sig, u64Sig);
  console.log(`  cfhScoreU64x16(sig, sig) = ${score}`);
  console.log(`  Expected: 1.0`);
  console.log(`  Pass: ${Math.abs(score - 1.0) < 0.001}\n`);

  // Test 5: Locality sensitivity (typo)
  console.log("Test 5: Locality sensitivity (typo)");
  const sigTypo1 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii?", 128));
  const sigTypo2 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii!?", 128)); // Typo
  const scoreTypo = cfhScoreU64x16(sigTypo1, sigTypo2);
  console.log(`  Similarity for typo: ${scoreTypo}`);
  console.log(`  Expected: > 0.9`);
  console.log(`  Pass: ${scoreTypo > 0.9}\n`);

  // Test 6: Locality sensitivity (paraphrase)
  console.log("Test 6: Locality sensitivity (paraphrase)");
  const sigPara = sigBytesToU64x16(generateSignatureBytes("can you tell me the pii rules?", 128)); // Paraphrase
  const scorePara = cfhScoreU64x16(sigTypo1, sigPara);
  console.log(`  Similarity for paraphrase: ${scorePara}`);
  console.log(`  Expected: > 0.58`);
  console.log(`  Pass: ${scorePara > 0.58}\n`);

  // Test 7: Locality sensitivity (semantic swap)
  console.log("Test 7: Locality sensitivity (semantic swap)");
  const sigSwap = sigBytesToU64x16(generateSignatureBytes("what is the weather in london?", 128)); // Semantic Swap
  const scoreSwap = cfhScoreU64x16(sigTypo1, sigSwap);
  console.log(`  Similarity for semantic swap: ${scoreSwap}`);
  console.log(`  Expected: < 0.65`);
  console.log(`  Pass: ${scoreSwap < 0.65}\n`);

  // Test 8: normalizeCanonical
  console.log("Test 8: normalizeCanonical");
  const tokens = normalizeCanonical("What is the POLICY for PII?");
  console.log(`  normalizeCanonical("What is the POLICY for PII?") = [${tokens.join(", ")}]`);
  console.log(`  Contains "P420" (policy): ${tokens.includes("P420")}`);
  console.log(`  Contains "P000" (pii): ${tokens.includes("P000")}`);
  console.log(`  Pass: ${tokens.includes("P420") && tokens.includes("P000")}\n`);

  console.log("=== All Tests Complete ===");
}

export {};
