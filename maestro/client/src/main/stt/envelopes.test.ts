/**
 * Envelope Tests - Backward Compatibility and addr_id Support
 * 
 * Tests verify:
 * 1. Legacy mirror path still works (stt.audio.append)
 * 2. New addr_id path works (stt.address.query)
 * 3. Optional addr_id fields in transcript payloads
 */

import {
  createAudioAppendEnvelope,
  createTranscriptPartialEnvelope,
  createTranscriptFinalEnvelope,
  createAddressQueryEnvelope,
  STTAudioAppendEnvelope,
  STTTranscriptPartialEnvelope,
  STTTranscriptFinalEnvelope,
  STTAddressQueryEnvelope,
  STTEnvelope,
  toBusMessage,
  serializeBusMessage,
  deserializeBusMessage,
} from "./envelopes";

// ============================================================================
// Test Runner
// ============================================================================

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    if (fn()) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name} (assertion failed)`);
      failed++;
    }
  } catch (e) {
    console.log(`✗ ${name} (error: ${e})`);
    failed++;
  }
}

// ============================================================================
// Legacy Mirror Path Tests
// ============================================================================

console.log("=== Legacy Mirror Path Tests ===\n");

test("createAudioAppendEnvelope creates valid envelope", () => {
  const audioData = Buffer.from("test audio data");
  const env = createAudioAppendEnvelope(
    "session-1",
    "chunk-1",
    audioData,
    1,
    1000
  );
  
  return (
    env.type === "stt.audio.append" &&
    env.session_id === "session-1" &&
    env.chunk_id === "chunk-1" &&
    env.payload.audio_data === audioData.toString("base64") &&
    env.payload.sequence_number === 1 &&
    env.payload.timestamp_ms === 1000
  );
});

test("createTranscriptPartialEnvelope creates valid envelope", () => {
  const alternatives = [
    { transcript: "hello world", rank: 0, score: 0.95, is_final: false }
  ];
  const env = createTranscriptPartialEnvelope(
    "session-1",
    "chunk-1",
    alternatives,
    100,
    0.5,
    "model-1"
  );
  
  return (
    env.type === "stt.transcript.partial" &&
    env.payload.alternatives.length === 1 &&
    env.payload.alternatives[0].transcript === "hello world" &&
    env.payload.latency_ms === 100 &&
    env.payload.redaction_applied === false
  );
});

test("createTranscriptFinalEnvelope creates valid envelope", () => {
  const alternatives = [
    { transcript: "hello world", rank: 0, score: 0.99, is_final: true }
  ];
  const env = createTranscriptFinalEnvelope(
    "session-1",
    "chunk-1",
    alternatives,
    150,
    0.5,
    "model-1",
    true
  );
  
  return (
    env.type === "stt.transcript.final" &&
    env.payload.alternatives[0].is_final === true &&
    env.payload.redaction_applied === true
  );
});

// ============================================================================
// addr_id Envelope Tests
// ============================================================================

console.log("\n=== addr_id Envelope Tests ===\n");

test("createAddressQueryEnvelope creates valid envelope", () => {
  const env = createAddressQueryEnvelope(
    "session-1",
    "chunk-1",
    "what is the policy for pii?",
    "addr-12345",
    "cfh-signature-hex",
    0.95,
    true
  );
  
  return (
    env.type === "stt.address.query" &&
    env.payload.transcript === "what is the policy for pii?" &&
    env.payload.addr_id === "addr-12345" &&
    env.payload.cfh_signature === "cfh-signature-hex" &&
    env.payload.confidence === 0.95 &&
    env.payload.is_final === true
  );
});

test("createAddressQueryEnvelope with optional hints", () => {
  const env = createAddressQueryEnvelope(
    "session-1",
    "chunk-1",
    "install postgres",
    "addr-67890",
    "cfh-sig",
    0.98,
    true,
    {
      opcodeHint: "INSTALL",
      slotsHint: { entity: "postgres" },
      tenantId: "tenant-1"
    }
  );
  
  return (
    env.type === "stt.address.query" &&
    env.payload.opcode_hint === "INSTALL" &&
    env.payload.slots_hint !== undefined &&
    env.payload.slots_hint.entity === "postgres" &&
    env.tenant_id === "tenant-1"
  );
});

test("TranscriptPayload accepts optional addr_id", () => {
  const alternatives = [
    { transcript: "hello world", rank: 0, score: 0.95, is_final: true }
  ];
  const env = createTranscriptFinalEnvelope(
    "session-1",
    "chunk-1",
    alternatives,
    150,
    0.5,
    "model-1"
  );
  
  // Add optional addr_id fields
  env.payload.addr_id = "addr-12345";
  env.payload.cfh_signature = "cfh-sig";
  
  return (
    env.payload.addr_id === "addr-12345" &&
    env.payload.cfh_signature === "cfh-sig"
  );
});

// ============================================================================
// Bus Message Serialization Tests
// ============================================================================

console.log("\n=== Bus Message Serialization Tests ===\n");

test("toBusMessage wraps envelope correctly", () => {
  const audioData = Buffer.from("test");
  const env = createAudioAppendEnvelope("s1", "c1", audioData, 1, 1000);
  const msg = toBusMessage(env, "room-1", "channel-1", "client-1");
  
  return (
    msg.version === "1.0" &&
    msg.id.startsWith("arq_") &&
    msg.type === "event" &&
    msg.room === "room-1" &&
    msg.channel === "channel-1" &&
    msg.from === "client-1"
  );
});

test("serializeBusMessage and deserializeBusMessage round-trip", () => {
  const audioData = Buffer.from("test");
  const env = createAudioAppendEnvelope("s1", "c1", audioData, 1, 1000);
  const msg = toBusMessage(env, "room-1", "channel-1", "client-1");
  
  const json = serializeBusMessage(msg);
  const parsed = deserializeBusMessage(json);
  
  return (
    parsed !== null &&
    parsed.id === msg.id &&
    parsed.room === msg.room &&
    (parsed.payload as STTAudioAppendEnvelope).type === "stt.audio.append"
  );
});

test("deserializeBusMessage handles invalid JSON", () => {
  const result = deserializeBusMessage("not valid json");
  return result === null;
});

test("deserializeBusMessage handles missing fields", () => {
  const result = deserializeBusMessage('{"foo": "bar"}');
  return result === null;
});

// ============================================================================
// Summary
// ============================================================================

console.log("\n=== Summary ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
