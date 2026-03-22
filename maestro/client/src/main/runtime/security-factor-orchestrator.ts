import { SecurityTrustState } from "./security-session-policy-service";

export type SecurityAuthFactor = "voice" | "pin" | "passkey" | "totp";
export type SecurityFactorStepUpType = "none" | "pin" | "passkey" | "totp";
export type SecurityFactorDecision = "allow" | "block";

export interface SecurityFactorContractResult {
  requiredFactors: SecurityAuthFactor[];
  satisfiedFactors: SecurityAuthFactor[];
  missingFactor: SecurityAuthFactor | null;
  stepUpType: SecurityFactorStepUpType;
  factorDecision: SecurityFactorDecision;
  factorReasonCode: string;
  targetFactors: SecurityAuthFactor[];
  targetStepUpType: SecurityFactorStepUpType;
}

export interface SecurityFactorContractInput {
  riskLevel: "low" | "medium" | "high" | "privileged";
  trustState: SecurityTrustState;
}

function deriveTargetFactors(riskLevel: "low" | "medium" | "high" | "privileged"): {
  targetFactors: SecurityAuthFactor[];
  targetStepUpType: SecurityFactorStepUpType;
} {
  if (riskLevel === "medium") {
    return {
      targetFactors: ["voice", "pin"],
      targetStepUpType: "pin",
    };
  }

  if (riskLevel === "high" || riskLevel === "privileged") {
    return {
      targetFactors: ["voice", "passkey"],
      targetStepUpType: "passkey",
    };
  }

  return {
    targetFactors: ["voice"],
    targetStepUpType: "none",
  };
}

/**
 * Program B B1 additive factor contract.
 *
 * This freezes cross-surface fields while preserving current behavior:
 * executable policy still hard-requires per-command voice evidence, and
 * non-voice step-up factors are surfaced as target policy for later slices.
 */
export function evaluateSecurityFactorContract(
  input: SecurityFactorContractInput
): SecurityFactorContractResult {
  const { targetFactors, targetStepUpType } = deriveTargetFactors(input.riskLevel);
  const requiredFactors: SecurityAuthFactor[] = ["voice"];
  const satisfiedFactors: SecurityAuthFactor[] = input.trustState === "verified" ? ["voice"] : [];
  const missingFactor = satisfiedFactors.includes("voice") ? null : "voice";

  if (missingFactor) {
    return {
      requiredFactors,
      satisfiedFactors,
      missingFactor,
      stepUpType: "none",
      factorDecision: "block",
      factorReasonCode: "auth_block_voice_required",
      targetFactors,
      targetStepUpType,
    };
  }

  return {
    requiredFactors,
    satisfiedFactors,
    missingFactor: null,
    stepUpType: "none",
    factorDecision: "allow",
    factorReasonCode: "auth_stepup_voice_satisfied",
    targetFactors,
    targetStepUpType,
  };
}
