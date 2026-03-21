import React, { useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";
import { Row } from "../settings";
import { Select } from "../../components/select";
import { shell } from "../../shell";

const HIGH_RISK_COMMANDS = [
  "delete",
  "undo",
  "redo",
  "enter",
  "submit",
  "run privileged/system commands",
];

const SECURITY_MODE_DETAILS: Record<string, string> = {
  normal:
    "Balanced default. Low-risk commands stay fast, while medium/high-risk commands are still policy-gated.",
  shared_room:
    "Multi-speaker defensive mode. Tightens authorization when nearby voices may contaminate identity evidence.",
  secure:
    "Stricter single-user security. Requires stronger verification and reduces permissive fallback behavior.",
  restricted:
    "Maximum lock-down. High-friction mode for sensitive sessions where fail-closed behavior is preferred.",
};

const INTERACTION_MODE_DETAILS: Record<string, string> = {
  command: "Runtime command mode. Operating commands are handled through normal policy gates.",
  dictation:
    "Runtime dictation mode. Operating commands are intentionally gated harder while text dictation is active.",
};

const SecurityComponent: React.FC<{
  securityMode: string;
  securityInteractionMode: string;
  securityIdentityState: string;
  securityIdentityDisplayName: string;
  securityContaminated: boolean;
  securityIsVerified: boolean;
  securityConfidenceValue: number;
  securityEvidenceReady: boolean;
  securityVerificationProviderReady: boolean;
  securityDiarizationProviderReady: boolean;
  securityVerificationProviderError: string;
  securityDiarizationProviderError: string;
  securityEnrollmentActive: boolean;
  securityEnrollmentStatus: string;
  securityEnrollmentName: string;
  securityEnrollmentCount: number;
  securityLastAuthorizationDecision: string;
  securityLastAuthorizationReason: string;
  securityLastBlockedCommand: string;
  securityLastBlockedAt: string;
}> = ({
  securityMode,
  securityInteractionMode,
  securityIdentityState,
  securityIdentityDisplayName,
  securityContaminated,
  securityIsVerified,
  securityConfidenceValue,
  securityEvidenceReady,
  securityVerificationProviderReady,
  securityDiarizationProviderReady,
  securityVerificationProviderError,
  securityDiarizationProviderError,
  securityEnrollmentActive,
  securityEnrollmentStatus,
  securityEnrollmentName,
  securityEnrollmentCount,
  securityLastAuthorizationDecision,
  securityLastAuthorizationReason,
  securityLastBlockedCommand,
  securityLastBlockedAt,
}) => {
  const [displayName, setDisplayName] = useState(securityEnrollmentName || "Primary User");

  useEffect(() => {
    shell.send("securityRefreshStatus");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, []);

  useEffect(() => {
    if (securityEnrollmentName) {
      setDisplayName(securityEnrollmentName);
    }
  }, [securityEnrollmentName]);

  const modeOptions = useMemo(
    () => [
      { id: "normal", value: "Normal" },
      { id: "shared_room", value: "Shared Room" },
      { id: "secure", value: "Secure" },
      { id: "restricted", value: "Restricted" },
    ],
    []
  );

  const interactionOptions = useMemo(
    () => [
      { id: "command", value: "Command" },
      { id: "dictation", value: "Dictation" },
    ],
    []
  );

  const enrollmentLabel = securityEnrollmentActive
    ? securityEnrollmentStatus === "active"
      ? "Enrolled"
      : securityEnrollmentStatus === "revoked"
      ? "Revoked"
      : securityEnrollmentStatus === "suspended"
      ? "Suspended"
      : "Pending"
    : "Not Enrolled";
  const providersReady = securityVerificationProviderReady && securityDiarizationProviderReady;
  const showsSetupBanner = !securityEnrollmentActive || securityEnrollmentStatus !== "active";

  return (
    <div className="px-4">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mb-2">
          Voice Security Status
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs text-white/80">
          <div>
            Enrollment: <span className="text-white">{enrollmentLabel}</span>
          </div>
          <div>
            Verification: <span className="text-white">{securityIsVerified ? "Verified" : "Unverified"}</span>
          </div>
          <div>
            Provider readiness: <span className="text-white">{providersReady ? "Ready" : "Degraded"}</span>
          </div>
          <div>
            Identity: <span className="text-white">{securityIdentityState || "unknown"}</span>
          </div>
          <div>
            Confidence: <span className="text-white">{Math.round((securityConfidenceValue || 0) * 100)}%</span>
          </div>
          <div>
            Contaminated: <span className="text-white">{securityContaminated ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>

      {showsSetupBanner ? (
        <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-200 mb-1">Voice Enrollment Setup Needed</h3>
          <p className="text-xs text-cyan-100/90 mb-2">
            This machine is not fully enrolled yet. High-risk commands may confirm or block until enrollment is active.
          </p>
          <ol className="text-xs text-cyan-100/80 list-decimal list-inside space-y-1">
            <li>Set your enrollment profile name</li>
            <li>Click <span className="font-semibold">Start Enrollment</span></li>
            <li>Click <span className="font-semibold">Test Verification</span> and check Last authorization outcome</li>
          </ol>
        </div>
      ) : null}

      <Row
        title="Security mode"
        subtitle={SECURITY_MODE_DETAILS[securityMode] || SECURITY_MODE_DETAILS.normal}
        action={
          <div className="w-40 ml-auto">
            <Select
              items={modeOptions.map((e) => e.value)}
              value={modeOptions.find((e) => e.id === securityMode)?.value || "Normal"}
              onChange={(value) =>
                shell.send(
                  "securitySetMode",
                  modeOptions.find((e) => e.value === value)?.id || "normal"
                )
              }
            />
          </div>
        }
      />

      <Row
        title="Interaction mode (runtime-controlled)"
        subtitle={INTERACTION_MODE_DETAILS[securityInteractionMode] || INTERACTION_MODE_DETAILS.command}
        action={
          <div className="w-40 ml-auto flex items-center justify-end">
            <span className="inline-flex rounded border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-white/80">
              {interactionOptions.find((e) => e.id === securityInteractionMode)?.value || "Command"}
            </span>
          </div>
        }
      />

      <Row
        title="Enrollment profile"
        subtitle="Name used for your local owner profile"
        action={
          <input
            type="text"
            className="input w-40 py-1"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        }
      />

      <div className="flex flex-wrap gap-2 py-3 border-b border-white/5">
        <button
          className="px-3 py-1 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs uppercase tracking-widest"
          onClick={() => shell.send("securityUpsertEnrollment", displayName)}
        >
          {securityEnrollmentActive ? "Re-enroll / Reactivate" : "Start Enrollment"}
        </button>
        <button
          className="px-3 py-1 rounded bg-white/5 border border-white/20 text-white/80 text-xs uppercase tracking-widest"
          onClick={() => shell.send("securityRunProbe")}
        >
          Test Verification
        </button>
        <button
          className="px-3 py-1 rounded bg-red-500/10 border border-red-400/40 text-red-200 text-xs uppercase tracking-widest"
          onClick={() => shell.send("securityResetEnrollment")}
        >
          Reset Enrollment
        </button>
      </div>

      <div className="py-3 border-b border-white/5 text-sm">
        <h3 className="font-bold text-white/90 mb-1">High-risk gated commands</h3>
        <div className="text-white/60">{HIGH_RISK_COMMANDS.join(", ")}</div>
      </div>

      <div className="py-3 border-b border-white/5 text-sm">
        <h3 className="font-bold text-white/90 mb-1">Provider readiness</h3>
        <div className="text-white/70">WeSpeaker: {securityVerificationProviderReady ? "ready" : "unavailable"}</div>
        <div className="text-white/70">Diarization: {securityDiarizationProviderReady ? "ready" : "unavailable"}</div>
        {!securityVerificationProviderReady && securityVerificationProviderError ? (
          <div className="text-orange-300">WeSpeaker error: {securityVerificationProviderError}</div>
        ) : null}
        {!securityDiarizationProviderReady && securityDiarizationProviderError ? (
          <div className="text-orange-300">Diarization error: {securityDiarizationProviderError}</div>
        ) : null}
      </div>

      <div className="py-3 text-sm">
        <h3 className="font-bold text-white/90 mb-1">Last authorization outcome</h3>
        <div className="text-white/70">Decision: {securityLastAuthorizationDecision || "n/a"}</div>
        <div className="text-white/70">Reason: {securityLastAuthorizationReason || "n/a"}</div>
        <div className="text-white/70">Blocked command: {securityLastBlockedCommand || "n/a"}</div>
        <div className="text-white/70">Timestamp: {securityLastBlockedAt || "n/a"}</div>
      </div>

      <div className="text-[11px] text-white/50 mt-2">
        This tab centralizes identity mode, enrollment profile, verification readiness, and actionable
        block reasons in one place.
      </div>
      <div className="text-[11px] text-white/40 mt-1">Profiles loaded: {securityEnrollmentCount}</div>
      <div className="text-[11px] text-white/40 mt-1">
        Active identity label: {securityIdentityDisplayName || "unlabeled"}
      </div>
    </div>
  );
};

export const Security = connect((state: any) => ({
  securityMode: state.securityMode,
  securityInteractionMode: state.securityInteractionMode,
  securityIdentityState: state.securityIdentityState,
  securityIdentityDisplayName: state.securityIdentityDisplayName,
  securityContaminated: state.securityContaminated,
  securityIsVerified: state.securityIsVerified,
  securityConfidenceValue: state.securityConfidenceValue,
  securityEvidenceReady: state.securityEvidenceReady,
  securityVerificationProviderReady: state.securityVerificationProviderReady,
  securityDiarizationProviderReady: state.securityDiarizationProviderReady,
  securityVerificationProviderError: state.securityVerificationProviderError,
  securityDiarizationProviderError: state.securityDiarizationProviderError,
  securityEnrollmentActive: state.securityEnrollmentActive,
  securityEnrollmentStatus: state.securityEnrollmentStatus,
  securityEnrollmentName: state.securityEnrollmentName,
  securityEnrollmentCount: state.securityEnrollmentCount,
  securityLastAuthorizationDecision: state.securityLastAuthorizationDecision,
  securityLastAuthorizationReason: state.securityLastAuthorizationReason,
  securityLastBlockedCommand: state.securityLastBlockedCommand,
  securityLastBlockedAt: state.securityLastBlockedAt,
}))(SecurityComponent);
