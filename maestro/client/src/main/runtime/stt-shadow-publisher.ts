import { v4 as uuid } from "uuid";
import Log from "../log";
import Settings from "../settings";
import { Chunk } from "../stream/chunk-queue";
import STTTracking from "../stt/tracking";
import { generateSignatureBytes, sigBytesToU64x16 } from "../stt/cfh";

interface STTShadowPublisherDeps {
  getCurrentChunk: () => Chunk | undefined;
  getCurrentSessionId: () => string | undefined;
  log: Log;
  settings: Settings;
  tracking: STTTracking;
}

type TranscriptEnvelope = {
  transcript: string;
  rank: number;
  score: number;
  is_final: boolean;
};

export default class STTShadowPublisher {
  private busClient: any = null;
  private currentPredictiveAddrId?: string;
  private currentPredictiveCFHSignature?: string;
  private lastSASPrecheckResult?: { addrId: string; timestamp: number; valid: boolean };
  private pendingTranscript?: { text: string; isFinal: boolean; chunkId: string };
  private presencePulseInterval = 500;
  private presencePulseTimer?: NodeJS.Timeout;
  private throttleMaxRequestsPerSecond = 10;
  private throttleRequestTimestamps: number[] = [];
  private transcriptDebounceMs = 100;
  private transcriptDebounceTimer?: NodeJS.Timeout;

  constructor(private deps: STTShadowPublisherDeps) {}

  setBusClient(busClient: any) {
    this.busClient = busClient;
  }

  private computeAddrIdFromTranscript(
    transcript: string
  ): { addrId: string; cfhSignature: string } | null {
    if (!transcript || transcript.trim().length === 0) {
      return null;
    }

    try {
      const startTime = performance.now();
      const sigBytes = generateSignatureBytes(transcript, 128);
      sigBytesToU64x16(sigBytes);
      const cfhSignature = Array.from(sigBytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const addrId = "addr_" + cfhSignature.substring(0, 16);
      const elapsed = performance.now() - startTime;
      if (elapsed > 10) {
        this.deps.log.logVerbose(
          `[STTShadowPublisher] CFH signature generation took ${elapsed.toFixed(2)}ms`
        );
      }
      return { addrId, cfhSignature };
    } catch (error) {
      this.deps.log.logVerbose(`[STTShadowPublisher] Error computing addr_id: ${error}`);
      return null;
    }
  }

  private updatePredictiveAddrId(transcript: string, isFinal: boolean): void {
    const result = this.computeAddrIdFromTranscript(transcript);
    if (!result) {
      return;
    }

    this.currentPredictiveAddrId = result.addrId;
    this.currentPredictiveCFHSignature = result.cfhSignature;
    this.deps.log.logVerbose(
      `[STTShadowPublisher] Predictive addr_id updated: ${this.currentPredictiveAddrId} (final: ${isFinal})`
    );
  }

  private canSendSASPrecheck(): boolean {
    const oneSecondAgo = Date.now() - 1000;
    this.throttleRequestTimestamps = this.throttleRequestTimestamps.filter(
      (timestamp) => timestamp > oneSecondAgo
    );
    return this.throttleRequestTimestamps.length < this.throttleMaxRequestsPerSecond;
  }

  private recordSASPrecheckRequest(): void {
    this.throttleRequestTimestamps.push(Date.now());
  }

  private executeSASPrecheck(): void {
    if (!this.pendingTranscript) {
      return;
    }

    const { text, isFinal, chunkId } = this.pendingTranscript;
    this.pendingTranscript = undefined;

    if (!this.canSendSASPrecheck()) {
      this.deps.log.logVerbose(
        `[STTShadowPublisher] SAS precheck throttled for: ${text.substring(0, 30)}...`
      );
      if (
        this.lastSASPrecheckResult &&
        Date.now() - this.lastSASPrecheckResult.timestamp < 5000
      ) {
        this.deps.log.logVerbose(`[STTShadowPublisher] Using cached SAS precheck result`);
        return;
      }
    }

    this.recordSASPrecheckRequest();
    const result = this.computeAddrIdFromTranscript(text);
    const sessionId = this.deps.getCurrentSessionId();
    if (!result || !this.busClient || !this.busClient.isEnabled() || !sessionId) {
      return;
    }

    this.lastSASPrecheckResult = {
      addrId: result.addrId,
      timestamp: Date.now(),
      valid: true,
    };

    this.busClient.publishAddressQuery(
      sessionId,
      chunkId,
      text,
      result.addrId,
      result.cfhSignature,
      1.0,
      isFinal
    );
  }

  private scheduleSASPrecheck(transcript: string, isFinal: boolean, chunkId: string): void {
    this.pendingTranscript = { text: transcript, isFinal, chunkId };
    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
    }

    this.transcriptDebounceTimer = setTimeout(() => {
      this.executeSASPrecheck();
    }, this.transcriptDebounceMs);
  }

  private publishPresencePulse(): void {
    if (!this.currentPredictiveAddrId || !this.busClient || !this.busClient.isEnabled()) {
      return;
    }

    const sessionId = this.deps.getCurrentSessionId();
    if (!sessionId) {
      return;
    }

    const startTime = performance.now();
    try {
      this.busClient.publishPresencePulse(
        sessionId,
        this.deps.getCurrentChunk()?.id || uuid(),
        this.currentPredictiveAddrId,
        this.currentPredictiveCFHSignature || "",
        Date.now()
      );
      const elapsed = performance.now() - startTime;
      if (elapsed > 10) {
        this.deps.log.logVerbose(
          `[STTShadowPublisher] Presence pulse took ${elapsed.toFixed(2)}ms`
        );
      }
    } catch (error) {
      this.deps.log.logVerbose(`[STTShadowPublisher] Error publishing presence pulse: ${error}`);
    }
  }

  private publish(envelopeType: string, ...args: any[]): void {
    const sessionId = this.deps.getCurrentSessionId();
    if (!this.busClient || !this.busClient.isEnabled() || !sessionId) {
      return;
    }

    try {
      const chunkId = this.deps.getCurrentChunk()?.id || uuid();
      switch (envelopeType) {
        case "session_start":
          this.busClient.publishSessionStart(
            sessionId,
            chunkId,
            "en-US",
            this.deps.settings.getStreamingEndpoint()?.id || "default"
          );
          return;
        case "audio_append":
          this.busClient.publishAudioAppend(
            sessionId,
            chunkId,
            args[0],
            args[1],
            args[2],
            this.currentPredictiveAddrId
          );
          return;
        case "endpoint_request":
          this.busClient.publishEndpointRequest(sessionId, chunkId, args[0], args[1]);
          return;
        case "transcript_partial":
          this.busClient.publishTranscriptPartial(
            sessionId,
            chunkId,
            args[0],
            args[1],
            args[2],
            args[3],
            args[4],
            args[5],
            args[6]
          );
          return;
        case "transcript_final":
          this.busClient.publishTranscriptFinal(
            sessionId,
            chunkId,
            args[0],
            args[1],
            args[2],
            args[3],
            args[4],
            args[5],
            args[6]
          );
          return;
        case "session_stop":
          this.busClient.publishSessionStop(sessionId, args[0], args[1], args[2]);
          return;
      }
    } catch (error) {
      this.deps.log.logVerbose(`[STTShadowPublisher] Bus publish error: ${error}`);
    }
  }

  onSessionStart(): void {
    this.publish("session_start");
    if (!this.presencePulseTimer) {
      this.presencePulseTimer = setInterval(() => {
        this.publishPresencePulse();
      }, this.presencePulseInterval);
    }
  }

  onSessionStop(chunkId: string, durationMs: number): void {
    this.publish("session_stop", chunkId, "user_toggle", durationMs);
    if (this.presencePulseTimer) {
      clearInterval(this.presencePulseTimer);
      this.presencePulseTimer = undefined;
    }
    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
      this.transcriptDebounceTimer = undefined;
    }
    this.pendingTranscript = undefined;
    this.currentPredictiveAddrId = undefined;
    this.currentPredictiveCFHSignature = undefined;
  }

  publishAudioAppend(audio: Buffer, sequenceNumber: number, timestampMs: number): void {
    this.publish("audio_append", audio, sequenceNumber, timestampMs);
  }

  publishEndpointRequest(finalize: boolean, endpointType: string): void {
    this.publish("endpoint_request", finalize, endpointType);
  }

  onTranscriptObserved(
    transcriptText: string,
    isFinal: boolean,
    chunkId: string,
    alternatives: TranscriptEnvelope[],
    chunkLatencyMs: number,
    silenceThreshold: number,
    modelId: string
  ): void {
    if (transcriptText) {
      this.updatePredictiveAddrId(transcriptText, isFinal);
      this.scheduleSASPrecheck(transcriptText, isFinal, chunkId);
    }

    this.publish(
      isFinal ? "transcript_final" : "transcript_partial",
      alternatives,
      chunkLatencyMs,
      silenceThreshold,
      modelId,
      false,
      this.currentPredictiveAddrId,
      this.currentPredictiveCFHSignature
    );
  }
}
