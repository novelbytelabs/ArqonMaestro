import { v4 as uuid } from "uuid";

/**
 * Arqon Bus message protocol version
 */
export const BUS_PROTOCOL_VERSION = "1.0";

/**
 * Arqon Bus message types
 */
export type BusMessageType = "event" | "command" | "private" | "system" | "command_response" | "telemetry";

/**
 * STT Envelope message types
 */
export type STTMessageType =
  | "stt.session.start"
  | "stt.audio.append"
  | "stt.endpoint.request"
  | "stt.transcript.partial"
  | "stt.transcript.final"
  | "stt.session.stop"
  | "stt.health.status"
  | "stt.address.query";  // New: address-first routing message

/**
 * Common fields shared across all STT envelopes
 */
export interface STTCommonFields {
  /** Unique message identifier */
  message_id: string;
  /** Session identifier */
  session_id: string;
  /** Chunk identifier */
  chunk_id: string;
  /** 
   * Optional address identifier for address-first routing.
   * Enables O(0) routing via pre-computed semantic address.
   */
  addr_id?: string;
  /** Tenant/organization identifier */
  tenant_id: string;
  /** ISO8601 timestamp */
  timestamp: string;
  /** Message source (maestro, bus, etc.) */
  source: string;
  /** Schema version */
  version: string;
}

/**
 * Transcript alternative structure
 */
export interface TranscriptAlternative {
  /** The transcribed text */
  transcript: string;
  /** Rank among alternatives (0 = best) */
  rank: number;
  /** Confidence score */
  score: number;
  /** Whether this is a final transcript */
  is_final: boolean;
}

/**
 * Transcript payload structure
 */
export interface TranscriptPayload {
  /** Array of transcript alternatives */
  alternatives: TranscriptAlternative[];
  /** Latency from audio to transcript (ms) */
  latency_ms: number;
  /** Silence threshold used */
  silence_threshold: number;
  /** Model identifier */
  model_id: string;
  /** Whether CASIL redaction was applied */
  redaction_applied: boolean;
  /**
   * Optional address identifier for address-first routing.
   * When present, enables O(0) routing via pre-computed semantic address.
   * Generated from CFH signature + opcode + slots.
   */
  addr_id?: string;
  /**
   * Optional CFH signature for fuzzy matching.
   * Hex-encoded 1024-bit signature for locality-sensitive hashing.
   */
  cfh_signature?: string;
}

// ============================================================================
// STT Session Start
// ============================================================================

export interface STTSessionStartPayload {
  /** Language code (e.g., "en-US") */
  language: string;
  /** Model identifier */
  model_id: string;
  /** Editor context information */
  editor_context?: {
    application?: string;
    language?: string;
    content?: string;
    cursor_position?: number;
  };
}

export interface STTSessionStartEnvelope extends STTCommonFields {
  type: "stt.session.start";
  payload: STTSessionStartPayload;
}

// ============================================================================
// STT Audio Append
// ============================================================================

export interface STTAudioAppendPayload {
  /** Base64-encoded audio data */
  audio_data: string;
  /** Sequence number for ordering */
  sequence_number: number;
  /** Audio timestamp in milliseconds */
  timestamp_ms: number;
}

export interface STTAudioAppendEnvelope extends STTCommonFields {
  type: "stt.audio.append";
  payload: STTAudioAppendPayload;
}

// ============================================================================
// STT Endpoint Request
// ============================================================================

export interface STTEndpointRequestPayload {
  /** Whether to finalize the transcript */
  finalize: boolean;
  /** Type of endpoint request */
  endpoint_type: "partial" | "final" | "force_final";
}

export interface STTEndpointRequestEnvelope extends STTCommonFields {
  type: "stt.endpoint.request";
  payload: STTEndpointRequestPayload;
}

// ============================================================================
// STT Transcript Partial
// ============================================================================

export interface STTTranscriptPartialEnvelope extends STTCommonFields {
  type: "stt.transcript.partial";
  payload: TranscriptPayload;
}

// ============================================================================
// STT Transcript Final
// ============================================================================

export interface STTTranscriptFinalEnvelope extends STTCommonFields {
  type: "stt.transcript.final";
  payload: TranscriptPayload;
}

// ============================================================================
// STT Session Stop
// ============================================================================

export interface STTSessionStopPayload {
  /** Reason for stopping */
  reason: "user_toggle" | "silence" | "error" | "timeout" | "max_duration";
  /** Total session duration in milliseconds */
  duration_ms: number;
}

export interface STTSessionStopEnvelope extends STTCommonFields {
  type: "stt.session.stop";
  payload: STTSessionStopPayload;
}

// ============================================================================
// STT Health Status
// ============================================================================

export interface STTHealthStatusPayload {
  /** Health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Current latency to service (ms) */
  latency_ms: number;
  /** Error count in recent window */
  error_count: number;
}

export interface STTHealthStatusEnvelope extends STTCommonFields {
  type: "stt.health.status";
  payload: STTHealthStatusPayload;
}

// ============================================================================
// STT Address Query (Address-First Routing)
// ============================================================================

/**
 * Address query payload for address-first routing.
 * Enables O(0) routing by pre-computing semantic address on client side.
 */
export interface STTAddressQueryPayload {
  /** The transcribed text */
  transcript: string;
  /** Pre-computed address identifier (from CFH + opcode + slots) */
  addr_id: string;
  /** CFH signature hex (1024-bit) */
  cfh_signature: string;
  /** Confidence score from STT */
  confidence: number;
  /** Whether this is a final transcript */
  is_final: boolean;
  /** Optional opcode hint from client-side grammar */
  opcode_hint?: string;
  /** Optional slots from client-side parsing */
  slots_hint?: Record<string, string>;
}

export interface STTAddressQueryEnvelope extends STTCommonFields {
  type: "stt.address.query";
  payload: STTAddressQueryPayload;
}

// ============================================================================
// Union type for all STT envelopes
// ============================================================================

export type STTEnvelope =
  | STTSessionStartEnvelope
  | STTAudioAppendEnvelope
  | STTEndpointRequestEnvelope
  | STTTranscriptPartialEnvelope
  | STTTranscriptFinalEnvelope
  | STTSessionStopEnvelope
  | STTHealthStatusEnvelope
  | STTAddressQueryEnvelope;  // New: address-first routing

// ============================================================================
// Arqon Bus Message Wrapper
// ============================================================================

export interface BusMessage {
  /** Protocol version */
  version: string;
  /** Unique message ID (arq_<uuid>) */
  id: string;
  /** Message type */
  type: BusMessageType;
  /** Room name */
  room: string;
  /** Channel name */
  channel: string;
  /** Client ID of sender */
  from: string;
  /** ISO8601 timestamp */
  timestamp: string;
  /** Message payload */
  payload: STTEnvelope;
}

// ============================================================================
// Builder Functions
// ============================================================================

/**
 * Create the common fields for an STT envelope
 */
function createCommonFields(
  sessionId: string,
  chunkId: string,
  tenantId: string = "default",
  addrId?: string
): STTCommonFields {
  return {
    message_id: uuid(),
    session_id: sessionId,
    chunk_id: chunkId,
    addr_id: addrId,
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
    source: "maestro",
    version: BUS_PROTOCOL_VERSION,
  };
}

/**
 * Create an stt.session.start envelope
 */
export function createSessionStartEnvelope(
  sessionId: string,
  chunkId: string,
  language: string,
  modelId: string,
  editorContext?: STTSessionStartPayload["editor_context"],
  tenantId?: string,
  addrId?: string
): STTSessionStartEnvelope {
  return {
    ...createCommonFields(sessionId, chunkId, tenantId, addrId),
    type: "stt.session.start",
    payload: {
      language,
      model_id: modelId,
      editor_context: editorContext,
    },
  };
}

/**
 * Create an stt.audio.append envelope
 */
export function createAudioAppendEnvelope(
  sessionId: string,
  chunkId: string,
  audioData: Buffer,
  sequenceNumber: number,
  timestampMs: number,
  tenantId?: string,
  addrId?: string
): STTAudioAppendEnvelope {
  return {
    ...createCommonFields(sessionId, chunkId, tenantId, addrId),
    type: "stt.audio.append",
    payload: {
      audio_data: audioData.toString("base64"),
      sequence_number: sequenceNumber,
      timestamp_ms: timestampMs,
    },
  };
}

/**
 * Create an stt.endpoint.request envelope
 */
export function createEndpointRequestEnvelope(
  sessionId: string,
  chunkId: string,
  finalize: boolean,
  endpointType: "partial" | "final" | "force_final" = "partial",
  tenantId?: string,
  addrId?: string
): STTEndpointRequestEnvelope {
  return {
    ...createCommonFields(sessionId, chunkId, tenantId, addrId),
    type: "stt.endpoint.request",
    payload: {
      finalize,
      endpoint_type: endpointType,
    },
  };
}

/**
 * Create an stt.transcript.partial envelope
 */
export function createTranscriptPartialEnvelope(
  sessionId: string,
  chunkId: string,
  alternatives: TranscriptAlternative[],
  latencyMs: number,
  silenceThreshold: number,
  modelId: string,
  redactionApplied: boolean = false,
  tenantId?: string,
  addrId?: string
): STTTranscriptPartialEnvelope {
  return {
    ...createCommonFields(sessionId, chunkId, tenantId, addrId),
    type: "stt.transcript.partial",
    payload: {
      alternatives,
      latency_ms: latencyMs,
      silence_threshold: silenceThreshold,
      model_id: modelId,
      redaction_applied: redactionApplied,
    },
  };
}

/**
 * Create an stt.transcript.final envelope
 */
export function createTranscriptFinalEnvelope(
  sessionId: string,
  chunkId: string,
  alternatives: TranscriptAlternative[],
  latencyMs: number,
  silenceThreshold: number,
  modelId: string,
  redactionApplied: boolean = false,
  tenantId?: string,
  addrId?: string
): STTTranscriptFinalEnvelope {
  return {
    ...createCommonFields(sessionId, chunkId, tenantId, addrId),
    type: "stt.transcript.final",
    payload: {
      alternatives,
      latency_ms: latencyMs,
      silence_threshold: silenceThreshold,
      model_id: modelId,
      redaction_applied: redactionApplied,
    },
  };
}

/**
 * Create an stt.session.stop envelope
 */
export function createSessionStopEnvelope(
  sessionId: string,
  chunkId: string,
  reason: STTSessionStopPayload["reason"],
  durationMs: number,
  tenantId?: string,
  addrId?: string
): STTSessionStopEnvelope {
  return {
    ...createCommonFields(sessionId, chunkId, tenantId, addrId),
    type: "stt.session.stop",
    payload: {
      reason,
      duration_ms: durationMs,
    },
  };
}

/**
 * Create an stt.health.status envelope
 */
export function createHealthStatusEnvelope(
  sessionId: string,
  status: STTHealthStatusPayload["status"],
  latencyMs: number,
  errorCount: number = 0,
  tenantId?: string
): STTHealthStatusEnvelope {
  return {
    ...createCommonFields(sessionId, "", tenantId),
    type: "stt.health.status",
    payload: {
      status,
      latency_ms: latencyMs,
      error_count: errorCount,
    },
  };
}

/**
 * Create an stt.address.query envelope for address-first routing.
 * This is the NEW path that enables O(0) routing via pre-computed semantic address.
 * 
 * @param sessionId - Session identifier
 * @param chunkId - Chunk identifier
 * @param transcript - The transcribed text
 * @param addrId - Pre-computed address identifier (from CFH + opcode + slots)
 * @param cfhSignature - CFH signature hex (1024-bit)
 * @param confidence - Confidence score from STT
 * @param isFinal - Whether this is a final transcript
 * @param options - Optional opcode hint, slots hint, and tenant ID
 */
export function createAddressQueryEnvelope(
  sessionId: string,
  chunkId: string,
  transcript: string,
  addrId: string,
  cfhSignature: string,
  confidence: number,
  isFinal: boolean,
  options?: {
    opcodeHint?: string;
    slotsHint?: Record<string, string>;
    tenantId?: string;
  }
): STTAddressQueryEnvelope {
  const tId = options && options.tenantId ? options.tenantId : undefined;
  const oHint = options && options.opcodeHint ? options.opcodeHint : undefined;
  const sHint = options && options.slotsHint ? options.slotsHint : undefined;
  
  return {
    ...createCommonFields(sessionId, chunkId, tId, addrId),
    type: "stt.address.query",
    payload: {
      transcript,
      addr_id: addrId,
      cfh_signature: cfhSignature,
      confidence,
      is_final: isFinal,
      opcode_hint: oHint,
      slots_hint: sHint,
    },
  };
}

/**
 * Convert an STT envelope to an Arqon Bus message
 */
export function toBusMessage(
  envelope: STTEnvelope,
  room: string,
  channel: string,
  clientId: string
): BusMessage {
  return {
    version: BUS_PROTOCOL_VERSION,
    id: `arq_${envelope.message_id}`,
    type: "event",
    room,
    channel,
    from: clientId,
    timestamp: envelope.timestamp,
    payload: envelope,
  };
}

/**
 * Serialize a Bus message to JSON string
 */
export function serializeBusMessage(message: BusMessage): string {
  return JSON.stringify(message);
}

/**
 * Deserialize a JSON string to Bus message
 */
export function deserializeBusMessage(json: string): BusMessage | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.version && parsed.id && parsed.payload) {
      return parsed as BusMessage;
    }
    return null;
  } catch {
    return null;
  }
}
