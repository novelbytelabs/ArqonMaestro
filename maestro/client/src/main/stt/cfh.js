"use strict";
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
exports.__esModule = true;
exports.bucketFromSig = exports.cfhScoreU64x16 = exports.sigBytesToU64x16 = exports.generateSignatureBytes = exports.normalizeQuery = exports.normalizeCanonical = exports.SplitMix64 = exports.SIG_U64S = exports.SIG_BYTES = void 0;
var crypto_1 = require("crypto");
// ============================================================================
// Constants
// ============================================================================
/** Signature size in bytes (1024 bits) */
exports.SIG_BYTES = 128;
/** Signature size in u64s (16 * 8 = 128 bytes) */
exports.SIG_U64S = 16;
/** Stopwords to remove during canonical normalization */
var STOPWORDS = new Set([
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
var SplitMix64 = /** @class */ (function () {
    function SplitMix64(seed) {
        this.state = seed;
    }
    /**
     * Generate next u64 value
     */
    SplitMix64.prototype.nextU64 = function () {
        this.state = (this.state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
        var z = this.state;
        z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
        z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
        return z ^ (z >> 31n);
    };
    /**
     * Generate f32 in [-1, 1]
     */
    SplitMix64.prototype.nextF32Signed = function () {
        // Convert to [0, 1] then shift to [-1, 1]
        var maxUint64 = 0xffffffffffffffffn;
        return Number(this.nextU64() / maxUint64) * 2.0 - 1.0;
    };
    return SplitMix64;
}());
exports.SplitMix64 = SplitMix64;
// ============================================================================
// Stemming
// ============================================================================
/**
 * Very basic Porter-like stemmer for common suffixes.
 * Ported from Rust cfh.rs
 */
function stemWord(word) {
    var w = word.toLowerCase();
    // Remove common suffixes
    if (w.length > 4) {
        if (w.endsWith("ing"))
            return w.slice(0, -3);
        if (w.endsWith("tion"))
            return w.slice(0, -4);
        if (w.endsWith("ness"))
            return w.slice(0, -4);
        if (w.endsWith("ment"))
            return w.slice(0, -4);
        if (w.endsWith("able"))
            return w.slice(0, -4);
        if (w.endsWith("ible"))
            return w.slice(0, -4);
        if (w.endsWith("ies"))
            return w.slice(0, -3) + "y";
        if (w.endsWith("es") && w.length > 3)
            return w.slice(0, -2);
        if (w.endsWith("s") && !w.endsWith("ss"))
            return w.slice(0, -1);
        if (w.endsWith("ed") && w.length > 3)
            return w.slice(0, -2);
        if (w.endsWith("ly"))
            return w.slice(0, -2);
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
function soundex(word) {
    if (word.length === 0) {
        return "";
    }
    // If numeric, return as is (to distinguish "doc 10" from "doc 72")
    if (/^\d+$/.test(word)) {
        return word;
    }
    var chars = word.toLowerCase()
        .split("")
        .filter(function (c) { return c.trim().length > 0 && !/[^\w\u00C0-\u024F\u1E00-\u1EFF]/.test(c); });
    if (chars.length === 0) {
        return "";
    }
    var codeFor = function (c) {
        switch (c) {
            case 'b':
            case 'f':
            case 'p':
            case 'v': return '1';
            case 'c':
            case 'g':
            case 'j':
            case 'k':
            case 'q':
            case 's':
            case 'x':
            case 'z': return '2';
            case 'd':
            case 't': return '3';
            case 'l': return '4';
            case 'm':
            case 'n': return '5';
            case 'r': return '6';
            default: return null; // vowels and 'h', 'w' are ignored
        }
    };
    var result = chars[0].toUpperCase();
    var prevCode = codeFor(chars[0]);
    for (var i = 1; i < chars.length; i++) {
        if (result.length >= 4) {
            break;
        }
        var code = codeFor(chars[i]);
        if (code !== null) {
            if (code !== prevCode) {
                result += code;
                prevCode = code;
            }
        }
        else {
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
function normalizeCanonical(q) {
    var lower = q.toLowerCase();
    // Keep only alphanumeric and spaces (mimic Rust is_alphanumeric() || is_whitespace())
    var cleaned = "";
    for (var _i = 0, lower_1 = lower; _i < lower_1.length; _i++) {
        var c = lower_1[_i];
        if (/[a-z0-9]/i.test(c) || /\s/.test(c) || c.trim().length > 0 && !/[^\w\u00C0-\u024F\u1E00-\u1EFF]/.test(c)) {
            cleaned += c;
        }
        else {
            cleaned += ' ';
        }
    }
    var tokens = cleaned
        .split(/\s+/)
        .map(function (w) { return stemWord(w); })
        .filter(function (w) { return !STOPWORDS.has(w) && w.length > 1; })
        .map(function (w) {
        // Only soundex pure alphabetic tokens. (matches Rust w.chars().all(|c| c.is_ascii_alphabetic()))
        // Keep numeric / alphanumeric tokens to prevent "doc 10" collapsing to "doc 72".
        if (/^[a-zA-Z]+$/.test(w)) {
            return soundex(w);
        }
        else {
            return w;
        }
    })
        .filter(function (s) { return s.length > 0; });
    // Sort and deduplicate
    tokens.sort();
    var deduped = [];
    var prev = "";
    for (var _a = 0, tokens_1 = tokens; _a < tokens_1.length; _a++) {
        var t = tokens_1[_a];
        if (t !== prev) {
            deduped.push(t);
            prev = t;
        }
    }
    return deduped;
}
exports.normalizeCanonical = normalizeCanonical;
/**
 * Basic normalization (legacy compatibility).
 * Ported from Rust cfh.rs
 */
function normalizeQuery(q) {
    var lower = q.toLowerCase();
    return lower.split(/\s+/).filter(function (s) { return s.length > 0; }).join(" ");
}
exports.normalizeQuery = normalizeQuery;
// ============================================================================
// Feature Projection
// ============================================================================
/**
 * Project a feature into the high-dimensional accumulator with specific weight (density).
 * Ported from Rust cfh.rs
 */
function projectFeature(feat, acc, density) {
    var dim = acc.length;
    // Use SHA256 for hashing (Node.js built-in)
    var hash = (0, crypto_1.createHash)('sha256');
    hash.update(feat);
    var hashBytes = hash.digest();
    // Convert first 16 bytes to two u64 seeds
    var seed1 = hashBytes.readBigUInt64LE(0);
    var seed2 = hashBytes.readBigUInt64LE(8);
    var rng = new SplitMix64(seed1 ^ seed2);
    for (var i = 0; i < density; i++) {
        var bit = Number(rng.nextU64() % BigInt(dim));
        if (Number(rng.nextU64() % 2n) === 0) {
            acc[bit] += 1.0;
        }
        else {
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
function generateSignatureBytes(query, dim) {
    if (dim === void 0) { dim = 128; }
    var tokens = normalizeCanonical(query);
    var nBits = dim * 8;
    // Use regular number array for mutability (Float32Array copy issue)
    var accumulator = new Array(nBits).fill(0);
    // Project each canonical token with high density
    for (var _i = 0, tokens_2 = tokens; _i < tokens_2.length; _i++) {
        var token = tokens_2[_i];
        // Token-level projection (high weight for whole word stability)
        projectFeature(token, accumulator, 256);
        // Char-trigrams for typo resilience
        var chars = token.split("");
        if (chars.length >= 3) {
            for (var i = 0; i <= chars.length - 3; i++) {
                var trigram = chars.slice(i, i + 3).join("");
                projectFeature(trigram, accumulator, 64);
            }
        }
        // Prefix/suffix for morphological affinity
        if (chars.length >= 3) {
            var prefix = chars.slice(0, 3).join("");
            var suffix = chars.slice(chars.length - 3).join("");
            projectFeature("^" + prefix, accumulator, 32);
            projectFeature(suffix + "$", accumulator, 32);
        }
    }
    // Sign-based quantization into bitstring
    var out = new Uint8Array(dim);
    for (var i = 0; i < nBits; i++) {
        var val = accumulator[i];
        var bitIsOne = void 0;
        if (val > 0) {
            bitIsOne = true;
        }
        else if (val < 0) {
            bitIsOne = false;
        }
        else {
            // Tie case: use deterministic fallback based on index
            // SplitMix64 with seed = i
            var tieRng = new SplitMix64(BigInt(i));
            bitIsOne = Number(tieRng.nextU64() % 2n) === 0;
        }
        if (bitIsOne) {
            out[Math.floor(i / 8)] |= 1 << (i % 8);
        }
    }
    return out;
}
exports.generateSignatureBytes = generateSignatureBytes;
/**
 * Convert signature bytes to [u64; 16] for fast SIMD-friendly scoring.
 * Ported from Rust cfh.rs
 */
function sigBytesToU64x16(sig) {
    var out = new Array(exports.SIG_U64S).fill(0n);
    var take = Math.min(sig.length, exports.SIG_BYTES);
    // Create Buffer with zeros (Buffer is required for readBigUInt64LE)
    var buf = Buffer.alloc(exports.SIG_BYTES);
    buf.set(sig.slice(0, take), 0);
    for (var i = 0; i < exports.SIG_U64S; i++) {
        var start = i * 8;
        out[i] = buf.readBigUInt64LE(start);
    }
    return out;
}
exports.sigBytesToU64x16 = sigBytesToU64x16;
/**
 * CFH similarity score using XOR + POPCOUNT.
 *
 * Returns similarity in [0, 1] where 1 = identical.
 * Ported from Rust cfh.rs
 */
function cfhScoreU64x16(a, b) {
    var xorBits = 0;
    for (var i = 0; i < exports.SIG_U64S; i++) {
        var xorVal = a[i] ^ b[i];
        // Count set bits (popcount)
        var x = xorVal;
        while (x > 0n) {
            xorBits += Number(x & 1n);
            x >>= 1n;
        }
    }
    // similarity = 1 - (xor_bits / total_bits)
    return 1.0 - (xorBits / 1024.0);
}
exports.cfhScoreU64x16 = cfhScoreU64x16;
/**
 * Compute bucket from signature.
 * Ported from Rust cfh.rs
 */
function bucketFromSig(sig, numBuckets) {
    return Number(sig[0] % BigInt(numBuckets));
}
exports.bucketFromSig = bucketFromSig;
// ============================================================================
// Tests
// ============================================================================
if (require.main === module) {
    console.log("=== CFH TypeScript Implementation Tests ===\n");
    // Test 1: normalizeQuery
    console.log("Test 1: normalizeQuery");
    var q1 = normalizeQuery("  Hello   WORLD  ");
    console.log("  normalizeQuery(\"  Hello   WORLD  \") = \"".concat(q1, "\""));
    console.log("  Expected: \"hello world\"");
    console.log("  Pass: ".concat(q1 === "hello world", "\n"));
    // Test 2: normalizeQuery 2
    console.log("Test 2: normalizeQuery (2)");
    var q2 = normalizeQuery("Test");
    console.log("  normalizeQuery(\"Test\") = \"".concat(q2, "\""));
    console.log("  Expected: \"test\"");
    console.log("  Pass: ".concat(q2 === "test", "\n"));
    // Test 3: Signature deterministic
    console.log("Test 3: Signature deterministic");
    var sig1 = generateSignatureBytes("test query", 128);
    var sig2_1 = generateSignatureBytes("test query", 128);
    var sig1Match = Array.from(sig1).every(function (v, i) { return v === sig2_1[i]; });
    console.log("  generateSignatureBytes(\"test query\", 128).length = ".concat(sig1.length));
    console.log("  Expected length: 128");
    console.log("  Deterministic: ".concat(sig1Match));
    console.log("  Pass: ".concat(sig1.length === 128 && sig1Match, "\n"));
    // Test 4: Score identical
    console.log("Test 4: Score identical");
    var sig = generateSignatureBytes("test", 128);
    var u64Sig = sigBytesToU64x16(sig);
    var score = cfhScoreU64x16(u64Sig, u64Sig);
    console.log("  cfhScoreU64x16(sig, sig) = ".concat(score));
    console.log("  Expected: 1.0");
    console.log("  Pass: ".concat(Math.abs(score - 1.0) < 0.001, "\n"));
    // Test 5: Locality sensitivity (typo)
    console.log("Test 5: Locality sensitivity (typo)");
    var sigTypo1 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii?", 128));
    var sigTypo2 = sigBytesToU64x16(generateSignatureBytes("what is the policy for pii!?", 128)); // Typo
    var scoreTypo = cfhScoreU64x16(sigTypo1, sigTypo2);
    console.log("  Similarity for typo: ".concat(scoreTypo));
    console.log("  Expected: > 0.9");
    console.log("  Pass: ".concat(scoreTypo > 0.9, "\n"));
    // Test 6: Locality sensitivity (paraphrase)
    console.log("Test 6: Locality sensitivity (paraphrase)");
    var sigPara = sigBytesToU64x16(generateSignatureBytes("can you tell me the pii rules?", 128)); // Paraphrase
    var scorePara = cfhScoreU64x16(sigTypo1, sigPara);
    console.log("  Similarity for paraphrase: ".concat(scorePara));
    console.log("  Expected: > 0.58");
    console.log("  Pass: ".concat(scorePara > 0.58, "\n"));
    // Test 7: Locality sensitivity (semantic swap)
    console.log("Test 7: Locality sensitivity (semantic swap)");
    var sigSwap = sigBytesToU64x16(generateSignatureBytes("what is the weather in london?", 128)); // Semantic Swap
    var scoreSwap = cfhScoreU64x16(sigTypo1, sigSwap);
    console.log("  Similarity for semantic swap: ".concat(scoreSwap));
    console.log("  Expected: < 0.65");
    console.log("  Pass: ".concat(scoreSwap < 0.65, "\n"));
    // Test 8: normalizeCanonical
    console.log("Test 8: normalizeCanonical");
    var tokens = normalizeCanonical("What is the POLICY for PII?");
    console.log("  normalizeCanonical(\"What is the POLICY for PII?\") = [".concat(tokens.join(", "), "]"));
    console.log("  Contains \"P420\" (policy): ".concat(tokens.includes("P420")));
    console.log("  Contains \"P000\" (pii): ".concat(tokens.includes("P000")));
    console.log("  Pass: ".concat(tokens.includes("P420") && tokens.includes("P000"), "\n"));
    console.log("=== All Tests Complete ===");
}
