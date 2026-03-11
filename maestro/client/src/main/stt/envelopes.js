"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.createActionBlockedEnvelope = exports.createActionBlockEnvelope = exports.createActionAllowEnvelope = exports.createActionReviewEnvelope = exports.createSpeechRequestEnvelope = exports.deserializeBusMessage = exports.serializeBusMessage = exports.toBusMessage = exports.createAddressQueryEnvelope = exports.createHealthStatusEnvelope = exports.createSessionStopEnvelope = exports.createTranscriptFinalEnvelope = exports.createTranscriptPartialEnvelope = exports.createEndpointRequestEnvelope = exports.createAudioAppendEnvelope = exports.createSessionStartEnvelope = exports.BUS_PROTOCOL_VERSION = void 0;
var uuid_1 = require("uuid");
/**
 * Arqon Bus message protocol version
 */
exports.BUS_PROTOCOL_VERSION = "1.0";
// ============================================================================
// Builder Functions
// ============================================================================
/**
 * Create the common fields for an STT envelope
 */
function createCommonFields(sessionId, chunkId, tenantId, addrId) {
    if (tenantId === void 0) { tenantId = "default"; }
    return {
        message_id: (0, uuid_1.v4)(),
        session_id: sessionId,
        chunk_id: chunkId,
        addr_id: addrId,
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        source: "maestro",
        version: exports.BUS_PROTOCOL_VERSION
    };
}
/**
 * Create an stt.session.start envelope
 */
function createSessionStartEnvelope(sessionId, chunkId, language, modelId, editorContext, tenantId, addrId) {
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.session.start", payload: {
            language: language,
            model_id: modelId,
            editor_context: editorContext
        } });
}
exports.createSessionStartEnvelope = createSessionStartEnvelope;
/**
 * Create an stt.audio.append envelope
 */
function createAudioAppendEnvelope(sessionId, chunkId, audioData, sequenceNumber, timestampMs, tenantId, addrId) {
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.audio.append", payload: {
            audio_data: audioData.toString("base64"),
            sequence_number: sequenceNumber,
            timestamp_ms: timestampMs
        } });
}
exports.createAudioAppendEnvelope = createAudioAppendEnvelope;
/**
 * Create an stt.endpoint.request envelope
 */
function createEndpointRequestEnvelope(sessionId, chunkId, finalize, endpointType, tenantId, addrId) {
    if (endpointType === void 0) { endpointType = "partial"; }
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.endpoint.request", payload: {
            finalize: finalize,
            endpoint_type: endpointType
        } });
}
exports.createEndpointRequestEnvelope = createEndpointRequestEnvelope;
/**
 * Create an stt.transcript.partial envelope
 */
function createTranscriptPartialEnvelope(sessionId, chunkId, alternatives, latencyMs, silenceThreshold, modelId, redactionApplied, tenantId, addrId) {
    if (redactionApplied === void 0) { redactionApplied = false; }
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.transcript.partial", payload: {
            alternatives: alternatives,
            latency_ms: latencyMs,
            silence_threshold: silenceThreshold,
            model_id: modelId,
            redaction_applied: redactionApplied
        } });
}
exports.createTranscriptPartialEnvelope = createTranscriptPartialEnvelope;
/**
 * Create an stt.transcript.final envelope
 */
function createTranscriptFinalEnvelope(sessionId, chunkId, alternatives, latencyMs, silenceThreshold, modelId, redactionApplied, tenantId, addrId) {
    if (redactionApplied === void 0) { redactionApplied = false; }
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.transcript.final", payload: {
            alternatives: alternatives,
            latency_ms: latencyMs,
            silence_threshold: silenceThreshold,
            model_id: modelId,
            redaction_applied: redactionApplied
        } });
}
exports.createTranscriptFinalEnvelope = createTranscriptFinalEnvelope;
/**
 * Create an stt.session.stop envelope
 */
function createSessionStopEnvelope(sessionId, chunkId, reason, durationMs, tenantId, addrId) {
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.session.stop", payload: {
            reason: reason,
            duration_ms: durationMs
        } });
}
exports.createSessionStopEnvelope = createSessionStopEnvelope;
/**
 * Create an stt.health.status envelope
 */
function createHealthStatusEnvelope(sessionId, status, latencyMs, errorCount, tenantId) {
    if (errorCount === void 0) { errorCount = 0; }
    return __assign(__assign({}, createCommonFields(sessionId, "", tenantId)), { type: "stt.health.status", payload: {
            status: status,
            latency_ms: latencyMs,
            error_count: errorCount
        } });
}
exports.createHealthStatusEnvelope = createHealthStatusEnvelope;
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
function createAddressQueryEnvelope(sessionId, chunkId, transcript, addrId, cfhSignature, confidence, isFinal, options) {
    var tId = options && options.tenantId ? options.tenantId : undefined;
    var oHint = options && options.opcodeHint ? options.opcodeHint : undefined;
    var sHint = options && options.slotsHint ? options.slotsHint : undefined;
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tId, addrId)), { type: "stt.address.query", payload: {
            transcript: transcript,
            addr_id: addrId,
            cfh_signature: cfhSignature,
            confidence: confidence,
            is_final: isFinal,
            opcode_hint: oHint,
            slots_hint: sHint
        } });
}
exports.createAddressQueryEnvelope = createAddressQueryEnvelope;
/**
 * Convert an STT envelope to an Arqon Bus message
 */
function toBusMessage(envelope, room, channel, clientId) {
    return {
        version: exports.BUS_PROTOCOL_VERSION,
        id: "arq_".concat(envelope.message_id),
        type: "event",
        room: room,
        channel: channel,
        from: clientId,
        timestamp: envelope.timestamp,
        payload: envelope
    };
}
exports.toBusMessage = toBusMessage;
/**
 * Serialize a Bus message to JSON string
 */
function serializeBusMessage(message) {
    return JSON.stringify(message);
}
exports.serializeBusMessage = serializeBusMessage;
/**
 * Deserialize a JSON string to Bus message
 */
function deserializeBusMessage(json) {
    try {
        var parsed = JSON.parse(json);
        if (parsed.version && parsed.id && parsed.payload) {
            return parsed;
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
exports.deserializeBusMessage = deserializeBusMessage;
/**
 * Create a speech request envelope (voice output)
 */
function createSpeechRequestEnvelope(sessionId, chunkId, audioData, audioFormat, transcript, durationMs, tenantId) {
    if (tenantId === void 0) { tenantId = "default"; }
    return {
        message_id: (0, uuid_1.v4)(),
        session_id: sessionId,
        chunk_id: chunkId,
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        source: "maestro",
        version: exports.BUS_PROTOCOL_VERSION,
        type: "stt.speech.request",
        payload: {
            audio_data: audioData,
            audio_format: audioFormat,
            transcript: transcript,
            duration_ms: durationMs
        }
    };
}
exports.createSpeechRequestEnvelope = createSpeechRequestEnvelope;
/**
 * Create a constitutive action review envelope (ACE/Anchor)
 */
function createActionReviewEnvelope(sessionId, chunkId, actionId, summary, context, timeoutMs, tenantId, addrId) {
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.action.review", payload: {
            action_id: actionId,
            summary: summary,
            context: context,
            timeout_ms: timeoutMs
        } });
}
exports.createActionReviewEnvelope = createActionReviewEnvelope;
/**
 * Create a constitutive action allow envelope
 */
function createActionAllowEnvelope(sessionId, chunkId, actionId, tenantId, addrId) {
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.action.allow", payload: {
            action_id: actionId
        } });
}
exports.createActionAllowEnvelope = createActionAllowEnvelope;
/**
 * Create a constitutive action block envelope
 */
function createActionBlockEnvelope(sessionId, chunkId, actionId, tenantId, addrId) {
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.action.block", payload: {
            action_id: actionId
        } });
}
exports.createActionBlockEnvelope = createActionBlockEnvelope;
/**
 * Create a unilateral action blocked envelope
 */
function createActionBlockedEnvelope(sessionId, chunkId, actionId, reason, message, tenantId, addrId) {
    return __assign(__assign({}, createCommonFields(sessionId, chunkId, tenantId, addrId)), { type: "stt.action.blocked", payload: {
            action_id: actionId,
            reason: reason,
            message: message
        } });
}
exports.createActionBlockedEnvelope = createActionBlockedEnvelope;
