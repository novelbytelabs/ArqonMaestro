import Log from "../log";
import Settings from "../settings";
import STTComparator from "../stt/comparator";
import STTTracking from "../stt/tracking";
import { core } from "../../gen/core";

interface TranscriptAlternativeEnvelope {
  transcript: string;
  rank: number;
  score: number;
  is_final: boolean;
}

interface TranscriptObservationDeps {
  comparator?: STTComparator;
  log: Log;
  settings: Settings;
  tracking: STTTracking;
}

interface ObserveTranscriptResponseParams {
  chunkId: string;
  onFinalLatency: (chunkLatencyMs: number) => void;
  onPredictiveTranscript: (transcriptText: string, isFinal: boolean, chunkId: string) => void;
  onPublishTranscript: (
    kind: "transcript_final" | "transcript_partial",
    alternatives: TranscriptAlternativeEnvelope[],
    chunkLatencyMs: number,
    silenceThreshold: number,
    modelId: string
  ) => void;
  response: core.ICommandsResponse;
  sessionId?: string;
}

// Owns transcript-response observation: latency bookkeeping, comparator feed,
// transcript normalization, and shadow-publish preparation.
export default class TranscriptResponseObserver {
  constructor(private deps: TranscriptObservationDeps) {}

  observe({
    chunkId,
    onFinalLatency,
    onPredictiveTranscript,
    onPublishTranscript,
    response,
    sessionId,
  }: ObserveTranscriptResponseParams): void {
    this.deps.log.logVerbose(
      `Received ${response.final ? "final" : "partial"} response for ${chunkId}: [${(
        response.alternatives || []
      )
        .map((alternative: any) => alternative.transcript)
        .join(", ")}]`
    );

    const chunkMetrics = this.deps.tracking.getChunkMetrics(chunkId);
    const chunkLatencyMs = chunkMetrics?.received_at ? Date.now() - chunkMetrics.received_at : 0;

    if (response.final) {
      this.deps.tracking.onFinalResponse(chunkId);
      this.deps.tracking.logLatencyMetrics(chunkId);
      onFinalLatency(chunkLatencyMs);
    } else {
      this.deps.tracking.onPartialResponse(chunkId);
    }

    const alternatives = (response.alternatives || []).map((alternative: any, index: number) => ({
      transcript: alternative.transcript || "",
      rank: index,
      score: alternative.confidence || alternative.score || 0,
      is_final: !!response.final,
    }));

    if (this.deps.comparator?.isEnabled() && sessionId) {
      this.deps.comparator.storeWebSocketResponse(
        sessionId,
        chunkId,
        alternatives,
        chunkLatencyMs,
        !!response.final
      );
    }

    const transcriptText = (response.alternatives || [])
      .map((alternative: any) => alternative.transcript)
      .filter(Boolean)
      .join(" ");
    if (transcriptText) {
      onPredictiveTranscript(transcriptText, !!response.final, chunkId);
    }

    const silenceThreshold = response.silenceThreshold || 0.3;
    const modelId = this.deps.settings.getStreamingEndpoint()?.id || "default";
    onPublishTranscript(
      response.final ? "transcript_final" : "transcript_partial",
      alternatives,
      chunkLatencyMs,
      silenceThreshold,
      modelId
    );
  }
}
