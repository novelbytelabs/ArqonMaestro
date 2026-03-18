import { VadDecision } from "./vad-provider";

export type TurnEventType =
  | "speech_start"
  | "speech_end"
  | "barge_in_candidate"
  | "interrupt_candidate";

export interface TurnVadContext {
  provider: string;
  source: "primary" | "shadow";
  isSpeech: boolean;
  speechProb: number;
  volume: number;
  consecutiveSpeech: number;
  consecutiveSilence: number;
  reason?: string;
}

export interface VadShadowComparison {
  frameIndex: number;
  timestampMs: number;
  streamTimeMs: number;
  primary: TurnVadContext;
  shadow: TurnVadContext;
  agreement: boolean;
  speechProbDelta: number;
  shadowLeadFrames: number;
}

export interface TurnEvent {
  type: TurnEventType;
  frameIndex: number;
  timestampMs: number;
  streamTimeMs: number;
  source: "turn_layer";
  reason: string;
  primary: TurnVadContext;
  shadow: TurnVadContext;
}

export function decisionToContext(decision: VadDecision): TurnVadContext {
  return {
    provider: decision.provider,
    source: decision.source,
    isSpeech: decision.isSpeech,
    speechProb: decision.speechProb,
    volume: decision.volume,
    consecutiveSpeech: decision.consecutiveSpeech,
    consecutiveSilence: decision.consecutiveSilence,
    reason: decision.reason,
  };
}

export function buildVadShadowComparison(params: {
  frameIndex: number;
  timestampMs: number;
  streamTimeMs: number;
  primary: VadDecision;
  shadow: VadDecision;
  shadowLeadFrames: number;
}): VadShadowComparison {
  return {
    frameIndex: params.frameIndex,
    timestampMs: params.timestampMs,
    streamTimeMs: params.streamTimeMs,
    primary: decisionToContext(params.primary),
    shadow: decisionToContext(params.shadow),
    agreement: params.primary.isSpeech === params.shadow.isSpeech,
    speechProbDelta: params.shadow.speechProb - params.primary.speechProb,
    shadowLeadFrames: params.shadowLeadFrames,
  };
}

export function shouldEmitBargeInCandidate(params: {
  speechStart: boolean;
  frameIndex: number;
  lastBargeInCandidateFrame: number;
  minGapFrames: number;
  primarySpeechProb: number;
  shadowLeadFrames: number;
}): boolean {
  if (!params.speechStart) {
    return false;
  }
  if (params.frameIndex - params.lastBargeInCandidateFrame < params.minGapFrames) {
    return false;
  }
  return params.primarySpeechProb >= 0.72 || params.shadowLeadFrames >= 2;
}

export function shouldEmitInterruptCandidate(params: {
  frameIndex: number;
  lastInterruptCandidateFrame: number;
  minGapFrames: number;
  primarySpeech: boolean;
  shadowSpeech: boolean;
  shadowLeadFrames: number;
}): boolean {
  if (params.frameIndex - params.lastInterruptCandidateFrame < params.minGapFrames) {
    return false;
  }
  if (params.primarySpeech) {
    return false;
  }
  if (!params.shadowSpeech) {
    return false;
  }
  return params.shadowLeadFrames >= 2;
}
