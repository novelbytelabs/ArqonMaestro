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

export const RUST_EXPECTED_SIGNATURES: Record<string, string> = {
  "test query": "7447dcd7e2211a483819854ef22dbbedd925cd6fcbaec417646a3b2b542cfb972e66bf2e2f3d52cb3ee1dfc4aee799863a8e27c7dccd90cbbaddb9af4055ccd9941a87da9adfc2555aa3e35d259c6b8c1bb7da5109b69b4eaf8ffec128de17b6a125a07525ae5ddf431b9d73e913a0ff462cc8d343b925",
  "TEST QUERY": "7447dcd7e2211a483819854ef22dbbedd925cd6fcbaec417646a3b2b542cfb972e66bf2e2f3d52cb3ee1dfc4aee799863a8e27c7dccd90cbbaddb9af4055ccd9941a87da9adfc2555aa3e35d259c6b8c1bb7da5109b69b4eaf8ffec128de17b6a125a07525ae5ddf431b9d73e913a0ff462cc8d343b925",
  "Test Query": "7447dcd7e2211a483819854ef22dbbedd925cd6fcbaec417646a3b2b542cfb972e66bf2e2f3d52cb3ee1dfc4aee799863a8e27c7dccd90cbbaddb9af4055ccd9941a87da9adfc2555aa3e35d259c6b8c1bb7da5109b69b4eaf8ffec128de17b6a125a07525ae5ddf431b9d73e913a0ff462cc8d343b925",
  "  Hello   WORLD  ": "0c85dc4dd62b9b4d1c1da20ecc6d6ba4e8006b5bacbf34b7642e61cba41e52e4cae7cfc02a1c2afb1f414cb4a2d75bb4232de757ac5d720c48e8913bdad178d8c6b3e64259bfea3aab50ea13b4822bc21a9d18b14e5bb02eabbbed8158dce3173775bcf4e58a47ffdc7b94b0d0261de42eafda8303e945",
  "what is the policy for pii?": "f4efdad7cbdbaa0b59b9db3cb0a552fdac6ea9eb4bf86a4bc20d3ba3add949d6825c562e8eb6be963bebf8f615ca02179612ce62eb4bfee87fbebc523fc6c6020c6a81d45acdfa890b2adfcdaab72d242dc0eeaf3fe8ea9c81cdfed188ba61f67f6aebbd714ebdbbf0389fddeea93bfd68c2d28bba23",
  "what is the policy for pii!?": "f4efdad7cbdbaa0b59b9db3cb0a552fdac6ea9eb4bf86a4bc20d3ba3add949d6825c562e8eb6be963bebf8f615ca02179612ce62eb4bfee87fbebc523fc6c6020c6a81d45acdfa890b2adfcdaab72d242dc0eeaf3fe8ea9c81cdfed188ba61f67f6aebbd714ebdbbf0389fddeea93bfd68c2d28bba23",
  "hello, world!": "0c85dc4dd62b9b4d1c1da20ecc6d6ba4e8006b5bacbf34b7642e61cba41e52e4cae7cfc02a1c2afb1f414cb4a2d75bb4232de757ac5d720c48e8913bdad178d8c6b3e64259bfea3aab50ea13b4822bc21a9d18b14e5bb02eabbbed8158dce3173775bcf4e58a47ffdc7b94b0d0261de42eafda8303e945",
  "don't stop": "6482ddd7a52bba4419c9931ad09d2ba78d03690a29bc341b414c83b91baf6801a3451f4c5f293e856a877cfb4cede789d8160c6f272c49a184c3a8dd1f180985dbcdecfba9a2548fe6e2df002372a96d7e70b77c60594013c06aae4ac8c32ed190e4beec8518dc7737792102d444be787ab56f4993109fa2bf44187bda171985",
  "email test@example.com": "e84dd87a648d7a6a4159884ad0bdf8adc926f82c4faed40055061390ea094304c8cc27c86a118a855b97513e1dcac68e95f33c022b090ac4cc49bef4258181b9f04c7a609d6272de5d745ea017e7a8669be0af7f255142f908b22d29ca189d9a9120fb94cdfc5c541af8c306d3c71c1afa447ddfc5a23e3481e7be41fa851145",
  "café": "7c45ecfd4329be7c1859a08ed0296fa7a080e96b3b9d1431053aa39b9d284b972e6e2fc90eef38a413a1503b65ec75cd8472ae63a5ad148182c5bcd5dd9ac3b55dcfd05aa75673aed710ef210077a87dfbe4e57e14d95488c17fa95b1888be58d023d7ab1158edf336f36485f6e41e497efc3ddd4b7e8b2abf4538cbda3b3b47",
  "naïve": "7447dcd7422b7a4c185df51cd03d0f85cf24697b5a9e021d246ebad508680f972a4e3b482eedb2d41e6f40ef69cdf7899620a66f23fd1ab9c4f9b9d04f1bc22f98cb96189b6248ea4710ffc08232883d1b08e536224940a9b16bad5a2889ba5fd0a69f8b5459d773b7736de570663c1926992dd9d37ae3a03f4e18cb9a1f0b49",
  "日本語": "7447dc7d43a99a0a1858b04bd03d2bb6e926696a3bbc1c17456f2395b4284fd72e643f4846fc7a848fe350fd65adf789aa338e24230515e9dc993854079bc3a5cdcd923a9712d3aa6e507f00c2763e77fb609d7e7c594489c169ad5b180a9e5810a6dd8b0158da61337365a4f4600e59fe703d89c3ff8900366678cb9a3b39c7",
  "🎉 party": "7007dd4cca2b9ac013c9b40cc03d2fa7f8046b692fbe941f256e23931cb809976e7d2f680ced688c1ba342f634a4f79d86b29f5737ac146980c9b8d51692c3a19cdf921217525b2a4654ff0486d3387dff60b53b326941bcc30bad1868a29f1850a6dfeb8b58fc2b3773c6f4f474de593f7558d8d07a87e07f4738dbda123b44",
  "": "7447dcfdc229ba4c1859b48ed03d2ba7e924696b1bbc1417456e239198284b972e443f480efd3a841be350ff64acf78996328e6727ac14e1c4c9b8d5179ac3a5ddcdd21a971272ae4750ff0082762875fb60b57e325944a9c16bad5b4889be58d0a69f8b0158de67377365a4f4641e597ef43dd9d37a8ba03f4738cbda1b3b45",
  "   ": "7447dcfdc229ba4c1859b48ed03d2ba7e924696b1bbc1417456e239198284b972e443f480efd3a841be350ff64acf78996328e6727ac14e1c4c9b8d5179ac3a5ddcdd21a971272ae4750ff0082762875fb60b57e325944a9c16bad5b4889be58d0a69f8b0158de67377365a4f4641e597ef43dd9d37a8ba03f4738cbda1b3b45",
  "a": "7447dcfdc229ba4c1859b48ed03d2ba7e924696b1bbc1417456e239198284b972e443f480efd3a841be350ff64acf78996328e6727ac14e1c4c9b8d5179ac3a5ddcdd21a971272ae4750ff0082762875fb60b57e325944a9c16bad5b4889be58d0a69f8b0158de67377365a4f4641e597ef43dd9d37a8ba03f4738cbda1b3b45",
  "a b c": "7447dcfdc229ba4c1859b48ed03d2ba7e924696b1bbc1417456e239198284b972e443f480efd3a841be350ff64acf78996328e6727ac14e1c4c9b8d5179ac3a5ddcdd21a971272ae4750ff0082762875fb60b57e325944a9c16bad5b4889be58d0a69f8b0158de67377365a4f4641e597ef43dd9d37a8ba03f4738cbda1b3b45",
  "doc 10": "5c4fd9f5642bb9489ad9ec8ed66979b4f924c92b1bae1097c53703d1d0ac5b9628447b121cf43ea41ae104d66ca4dbcd92ba467d27ac34e109cdb087173bd4b5c971543d9f32f3ae2657ed00823eaa352898b474315964b8f4ebadc374c9bc50a8a63f8a01d017e61ea95d3474601e49fd743c69f1f28fa03a553ccfda9a13f7",
  "doc 72": "7c4bd9fd4029b84938d9ae8ed66979b0fb04cd7f13ae1297c52743d1d0ae7b9c286573021cf71ea41ac144ff24a4f9d99212967da32c92e1c9cdb0951f3bf4b1c9f9552c9b1272ae2757fd008052a8752810b47430db64a184edafc318c9be58ca861f8a11d03526162d1d2ef4400e59dde43c39f1760ba41b7d3dcf5a9b3bff",
  "version 1.2.3": "7457dcdde8a9ba2c3f09b48cd82d1b27e934cd630b3e9416456a23d3982c4bd74e677f484afc3aad1b6b44ff44a0f7c3b61e8f652f7c36e0d4e9b095869a47a1d7ccd22a97125aa44770fe8402f22a65fb22b56f024946898189ad5948898e1890b65f8f8018cf75b67163b4f4441f106eb43dd9df7a93b03f470ac9d2136d55",
  "the quick brown fox": "7442dc6fe2a81bd17a1d7c8ef0fc7b24ad36cd73baff3c8e3426219b08fa5ef5c2246f250ed75a858fc3c5d964f4f3e192195c5c977426d0c9c770a5378a4125f0cd991c161752aa6104c592d272bc7de868f637a95058839069b59668483adb82ae8fcf0951af73b6247826f5661e7975753ffdd37eeb751f8e11c9cf1bfd57",
  "a an and are as at": "7447dcfdc229ba4c1859b48ed03d2ba7e924696b1bbc1417456e239198284b972e443f480efd3a841be350ff64acf78996328e6727ac14e1c4c9b8d5179ac3a5ddcdd21a971272ae4750ff0082762875fb60b57e325944a9c16bad5b4889be58d0a69f8b0158de67377365a4f4641e597ef43dd9d37a8ba03f4738cbda1b3b45",
  "running": "7fc3ddede221ba0e99c99c8ad0bd0bf5fd2d292b1bfc9811456aa39090280a95bc243f489abdbf80bba7517f6cbd738896b28c7627ac14e0c4cbacc513ab4557c945f83bf4127a0e3740ff0002568926fbe0b17e335904f1c167ed41c9a9bc58d0f677d301789de736f165843d641e787cb47cd9d1720bf2bf079249d8173365",
  "installation": "5d47d4fdc21bfb5d687bb42a903caba7e9267b6b0bb827065d6e2b81b8be4f9b2f445e400e85328e1be310fbc4a8d78d96928f66aba81c614049b0d717b94ba1d8dfc308e702728a4770bf80e2763afc7a68255e32592ca9c97acd3f4cbbfe5a50a69fcd001877469776278475649e497ff41959d73a03a03fc730c91a0b3a45",
  "happiness": "75455cdcc08bba4c3c59d4acac3d4ea7a9a2696b12bc1d59655e2391d828cbddaef63f4b2eed3a25aae354fd362ee79996128e673e9d14e1ccd9d85d13bac3a5fdc8d35a8752713e87585f9883f52e71fbe0a57e2e49c4bbc36bb4db4899bbd848259f8b4178d667373774a6f4661e797ea42d19c3788b203c4f3ccbca590b54",
  "applied": "7447dcfdd228ba461c5ab584d41d2ba3e924696339ac1417d57f2301b828cb8f2646bf480a7d32841bef50efe5aef5a91432862f6ee45460d8883885171a8335fdddd31e959372ac5f50d288805528347760b557b34940a9d12ae55b0cc83ad2f1b386890148ce77377366a4fc7c0ed957f53dd9d3688fa03e4738cbd21b1b60",
  "quickly": "6447dcefc2a99ac9585dec9ec06d6aa5ad24697b18f414165526219b0c324fd768647f240ef11a848fe345df64bcf3c996190e7e93b414e9cdcdf0b5179a4135d8cdd90c971242a84790ef02827e2c0de868f6763b515c8950e9adc348d93e5a88a68ecf0950cd6737357c86f4641e797974afddd37e8b203747b1cb1a1bfb27",
  "testing": "740ddcfcc2b92b484859b4cac02dabe5c8a6b9615bbc54175506079ac8284304ff44a7486a707a853bf7d03e64d8f58b95333e67276d04e5c4c5f8d51591d3ad9ccd9e7a9f3372ae47719f80876e2055fbe5a77e3b7946a9c1abad2b48098a18912697eb115cde0537b0c516f4661e5deef41dddc3768b3095473ed1520b3905",
  "tested": "740ddcfcc2b92b484859b4cac02dabe5c8a6b9615bbc54175506079ac8284304ff44a7486a707a853bf7d03e64d8f58b95333e67276d04e5c4c5f8d51591d3ad9ccd9e7a9f3372ae47719f80876e2055fbe5a77e3b7946a9c1abad2b48098a18912697eb115cde0537b0c516f4661e5deef41dddc3768b3095473ed1520b3905",
  "tests": "740ddcfcc2b92b484859b4cac02dabe5c8a6b9615bbc54175506079ac8284304ff44a7486a707a853bf7d03e64d8f58b95333e67276d04e5c4c5f8d51591d3ad9ccd9e7a9f3372ae47719f80876e2055fbe5a77e3b7946a9c1abad2b48098a18912697eb115cde0537b0c516f4661e5deef41dddc3768b3095473ed1520b3905",
  "!@#$%^&*()": "7447dcfdc229ba4c1859b48ed03d2ba7e924696b1bbc1417456e239198284b972e443f480efd3a841be350ff64acf78996328e6727ac14e1c4c9b8d5179ac3a5ddcdd21a971272ae4750ff0082762875fb60b57e325944a9c16bad5b4889be58d0a69f8b0158de67377365a4f4641e597ef43dd9d37a8ba03f4738cbda1b3b45",
  "hello\x00world": "040f5d5dc209fb494830b29e5d3922abe5c308681f5ea636022e2574dc1c6b3de4e5dd080cdf3b8413eadaebe7acfb8cd7220de777ad50c2e64998d0175ac3e9ddd9d282968272ee26dafe009a322c70f973715f88134239e191b55b59a99ed8d85cbfc9c159fec933e4f5ecf23d8f357eb49edbd02a2facff46120fcd191b40",
  "tab\there": "d645dcedc2197a4c380b679c90bfe8a175b9485b12b6353f7d6002b9b9284b8be7f13f283aed3a843ae1d4bd078cf781b64bca6737b974e14c499c659ff2c321e5d7e11af47a90acc6e13e00a6d570e1d341bd4e36198029c773ac1b69192c59d2a41c0341703e5a22bb60a4bc6416d97ef42d0bc64bc3881c2618cfca1bb244",
  "line1\nline2": "5063d9fc93239b4d527d904edd372b25e82c696b5bf9101f4d27eab1d028efa70c4c78680eae3b86094778fe479c3f8776328e670fbd03e165cbb8971fcb6b8c87c79a36811079460644da48005268c7e364bf3e33c965be796b99dbc019b7da708e8fdf00309667ab1377b0c5a41a7177ec3ed6432289553b5a3e8bdb270a47",
  "can you tell me the pii rules?": "74dfdcbde66bb0380819fe5db6335bf7e74d697a3ba95b53c0462543a01c5886a60452240e9c3da41023d2eef4ac378897b3cf67870db8c9c5e021e4b38ac3ed16bfd2ca8442a8ae56b2b3b04b503e51fbf3b05a7e7b54ace7603d5b68caeed85c849f804178cfc77f31ad25f4351f917ef57499ff7fc280b163304ece2f17d1",
  "what is the weather in london?": "b64f9a69c32bbc9e3e59b7cb583d29f6ed047bc20ab703474c4eb951b5385b97086d3fc206b932943b4150f722aef7ab2c30be2bf5aa54c7c6caf3c5538fc7a4cddcf622c71443b681d8bc949a762255fe40153e1f0d48b8a223a85b488996885c0698aaecd8dc271f3365067c44875b3a9435f95a79a8247bd67939131a33cd",
};

interface ParityFixture {
  input: string;
  description: string;
}

const PARITY_FIXTURES: ParityFixture[] = [
  // Basic cases - soundex("query") = Q600 (q=Q, u=vowel, e=vowel, r=6, y=vowel)
  {
    input: "test query",
    description: "basic lowercase",
  },
  {
    input: "TEST QUERY",
    description: "basic uppercase",
  },
  {
    input: "Test Query",
    description: "mixed case",
  },
  {
    input: "  Hello   WORLD  ",
    description: "whitespace variants",
  },
  
  // Punctuation
  {
    input: "what is the policy for pii?",
    description: "trailing punctuation",
  },
  {
    input: "what is the policy for pii!?",
    description: "multiple punctuation",
  },
  {
    input: "hello, world!",
    description: "punctuation middle",
  },
  
  // Unicode - Note: TS and Rust may handle unicode differently
  {
    input: "café",
    description: "unicode accent",
  },
  
  // Empty-like
  {
    input: "",
    description: "empty string",
  },
  {
    input: "   ",
    description: "whitespace only",
  },
  {
    input: "a",
    description: "single char",
  },
  {
    input: "a b c",
    description: "single char tokens",
  },
  
  // Numbers
  {
    input: "doc 10",
    description: "number",
  },
  {
    input: "doc 72",
    description: "number different",
  },
  
  // Stopwords - soundex("brown")=B650 (b=B, r=6, o=vowel, w=ignored, n=5)
  {
    input: "the quick brown fox",
    description: "stopwords",
  },
  {
    input: "a an and are as at",
    description: "all stopwords",
  },
  
  // Stemming
  {
    input: "running",
    description: "stem ing",
  },
  // soundex("installa") = I523 (i=I, n=5, s=2, t=3, a=vowel, l=4, l=ignored, a=vowel)
  {
    input: "installation",
    description: "stem tion",
  },
  
  // Edge cases
  {
    input: "!@#$%^&*()",
    description: "special chars only",
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
    const expectedHex = RUST_EXPECTED_SIGNATURES[fixture.input];
    if (!expectedHex) {
      console.log(`✗ [${fixture.description}] "${fixture.input}"`);
      console.log(`  Error: No Rust expected signature found in dictionary!`);
      failed++;
      mismatches.push(fixture.description);
      continue;
    }

    const tsSigBytes = generateSignatureBytes(fixture.input, 128);
    const tsHex = Buffer.from(tsSigBytes).toString("hex");
    
    if (tsHex === expectedHex) {
      console.log(`✓ [${fixture.description}] "${fixture.input}"`);
      passed++;
    } else {
      console.log(`✗ [${fixture.description}] "${fixture.input}"`);
      console.log(`  Expected (Rust): ${expectedHex.substring(0, 32)}...`);
      console.log(`  Actual (TS):     ${tsHex.substring(0, 32)}...`);
      failed++;
      mismatches.push(fixture.description);
    }
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
