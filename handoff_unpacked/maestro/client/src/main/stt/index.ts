export { default as STTTracking, createSTTTracking } from "./tracking";
export type { STTCorrelation, STTLatencyMetrics, STTReliabilityMetrics, STTStateMetrics, ChunkMetrics } from "./tracking";

export { default as BusClient, createBusClient, BusConnectionState } from "./bus-client";
export type { BusClientConfig, BusClientMetrics } from "./bus-client";

export { default as STTComparator, createSTTComparator } from "./comparator";
export type { TranscriptComparison, CommandComparison, ComparisonReport } from "./comparator";

export { default as MismatchReporter, createMismatchReporter } from "./mismatch-reporter";
export type { MismatchDetails, MismatchPattern, DetailedReport, LatencyHistogram } from "./mismatch-reporter";

export { default as SoakTester, createSoakTester, createRegressionTestRunner } from "./soak-tester";
export type { 
  SoakTestConfig, 
  SoakTestResult, 
  SoakFailure,
  HourlyStats,
  MemorySample,
  RegressionScenario,
  RegressionTestResult,
} from "./soak-tester";

export {
  BUS_PROTOCOL_VERSION,
  createSessionStartEnvelope,
  createAudioAppendEnvelope,
  createEndpointRequestEnvelope,
  createTranscriptPartialEnvelope,
  createTranscriptFinalEnvelope,
  createSessionStopEnvelope,
  createHealthStatusEnvelope,
  toBusMessage,
  serializeBusMessage,
  deserializeBusMessage,
} from "./envelopes";

export type {
  BusMessage,
  BusMessageType,
  STTMessageType,
  STTCommonFields,
  STTEnvelope,
  STTSessionStartEnvelope,
  STTSessionStartPayload,
  STTAudioAppendEnvelope,
  STTAudioAppendPayload,
  STTEndpointRequestEnvelope,
  STTEndpointRequestPayload,
  STTTranscriptPartialEnvelope,
  STTTranscriptFinalEnvelope,
  TranscriptPayload,
  TranscriptAlternative,
  STTSessionStopEnvelope,
  STTSessionStopPayload,
  STTHealthStatusEnvelope,
  STTHealthStatusPayload,
} from "./envelopes";
