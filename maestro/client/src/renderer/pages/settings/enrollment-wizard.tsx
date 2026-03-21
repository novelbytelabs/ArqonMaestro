import React, { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { shell } from "../../shell";

const StepChip: React.FC<{ active: boolean; done: boolean; title: string }> = ({
  active,
  done,
  title,
}) => (
  <div
    className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest border ${
      active
        ? "border-cyan-400 text-cyan-200 bg-cyan-500/20"
        : done
        ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
        : "border-white/15 text-white/50 bg-white/5"
    }`}
  >
    {title}
  </div>
);

const EnrollmentWizardComponent: React.FC<{
  securityEnrollmentActive: boolean;
  securityEnrollmentStatus: string;
  securityEnrollmentName: string;
  securityVerificationProviderReady: boolean;
  securityDiarizationProviderReady: boolean;
  securityVerificationProviderError: string;
  securityDiarizationProviderError: string;
  securityContaminated: boolean;
  securityIsVerified: boolean;
  securityLastAuthorizationDecision: string;
  securityLastAuthorizationReason: string;
  listening: boolean;
  alternatives: Array<{ transcript?: string; description?: string }>;
  suggestion: string;
}> = ({
  securityEnrollmentActive,
  securityEnrollmentStatus,
  securityEnrollmentName,
  securityVerificationProviderReady,
  securityDiarizationProviderReady,
  securityVerificationProviderError,
  securityDiarizationProviderError,
  securityContaminated,
  securityIsVerified,
  securityLastAuthorizationDecision,
  securityLastAuthorizationReason,
  listening,
  alternatives,
  suggestion,
}) => {
  const [consentChecked, setConsentChecked] = useState(false);
  const [displayName, setDisplayName] = useState(securityEnrollmentName || "Primary User");
  const [captureStarted, setCaptureStarted] = useState(false);
  const [verificationRun, setVerificationRun] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [runningAutoVerify, setRunningAutoVerify] = useState(false);
  const [runningManualVerify, setRunningManualVerify] = useState(false);
  const [manualVerifyAt, setManualVerifyAt] = useState<string>("");
  const [manualVerifyNote, setManualVerifyNote] = useState<string>("");
  const [autoEnabledListening, setAutoEnabledListening] = useState(false);
  const [guidedFlowCompleted, setGuidedFlowCompleted] = useState(false);
  const [phraseMatched, setPhraseMatched] = useState(false);
  const lastPreviewKeyRef = useRef("");
  const guidedSentences = useMemo(
    () => [
      "create elements",
      "observe security",
      "look at requests",
      "walk outside",
      "fly around",
    ],
    []
  );

  const normalize = (value: string): string =>
    value
      .toLowerCase()
      .replace(/<[^>]*>/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const expectedWords = useMemo(
    () => normalize(guidedSentences[wizardStep] || "").split(" ").filter(Boolean),
    [guidedSentences, wizardStep]
  );

  const expectedPhrase = useMemo(() => normalize(guidedSentences[wizardStep] || ""), [guidedSentences, wizardStep]);

  const candidatePhrases = useMemo(() => {
    const candidates: string[] = [];
    if (Array.isArray(alternatives)) {
      for (const alt of alternatives) {
        if (alt?.description) {
          candidates.push(normalize(alt.description));
        }
        if (alt?.transcript) {
          candidates.push(normalize(alt.transcript));
        }
      }
    }
    if (suggestion) {
      candidates.push(normalize(suggestion));
    }
    return candidates.filter(Boolean);
  }, [alternatives, suggestion]);

  const liveAlternativePhrase = useMemo(() => candidatePhrases[0] || "", [candidatePhrases]);

  useEffect(() => {
    if (!wizardOpen) {
      return;
    }
    setPhraseMatched(false);
  }, [wizardStep, wizardOpen]);

  useEffect(() => {
    if (!wizardOpen) {
      lastPreviewKeyRef.current = "";
      return;
    }

    if (!expectedPhrase) {
      return;
    }

    // Only emit a preview when THIS step has an exact current candidate match.
    // Prevents stale previous-step `phraseMatched=true` from auto-passing the next step.
    const exactMatch = candidatePhrases.some((candidate) => candidate === expectedPhrase);
    if (!exactMatch) {
      return;
    }

    const previewKey = `${wizardStep}:${expectedPhrase}`;
    if (lastPreviewKeyRef.current === previewKey) {
      return;
    }

    lastPreviewKeyRef.current = previewKey;
    shell.send("securityWizardPreviewPhrase", expectedPhrase);
  }, [wizardOpen, expectedPhrase, wizardStep, candidatePhrases]);

  useEffect(() => {
    if (!wizardOpen || !expectedPhrase) {
      return;
    }
    // Whole-phrase hard gate: command phrase must appear as a contiguous phrase.
    const matched = candidatePhrases.some(
      (candidate) =>
        candidate === expectedPhrase ||
        candidate.includes(` ${expectedPhrase} `) ||
        candidate.startsWith(`${expectedPhrase} `) ||
        candidate.endsWith(` ${expectedPhrase}`)
    );
    if (matched !== phraseMatched) {
      setPhraseMatched(matched);
    }
  }, [candidatePhrases, expectedPhrase, phraseMatched, wizardOpen]);

  const sentenceComplete = phraseMatched;

  useEffect(() => {
    shell.send("securityRefreshStatus");
  }, []);

  useEffect(() => {
    if (securityEnrollmentName) {
      setDisplayName(securityEnrollmentName);
    }
  }, [securityEnrollmentName]);

  const providersReady = securityVerificationProviderReady && securityDiarizationProviderReady;
  const enrollmentReady = securityEnrollmentActive && securityEnrollmentStatus === "active";

  const preflightPass = providersReady && !securityContaminated;
  const capturePass = enrollmentReady;
  const verifyPass = securityIsVerified || securityLastAuthorizationDecision.length > 0;

  const suggestedStep = useMemo(() => {
    if (!consentChecked) {
      return 1;
    }
    if (!preflightPass) {
      return 2;
    }
    if (!capturePass) {
      return 3;
    }
    if (!verifyPass) {
      return 4;
    }
    return 5;
  }, [capturePass, consentChecked, preflightPass, verifyPass]);

  const startEnrollment = (): void => {
    if (!guidedFlowCompleted) {
      return;
    }
    setCaptureStarted(true);
    shell.send("securityUpsertEnrollment", displayName);
    shell.send("securityRefreshStatus");
  };

  const runVerification = (): void => {
    setRunningManualVerify(true);
    setVerificationRun(true);
    setManualVerifyAt(new Date().toLocaleTimeString());
    setManualVerifyNote("Running verification probe...");
    shell.send("securityRunProbe");
    window.setTimeout(() => {
      shell.send("securityRefreshStatus");
      setRunningManualVerify(false);
      setManualVerifyNote("Verification probe completed. Review status below.");
    }, 1100);
  };

  const openVoiceWizard = (): void => {
    setWizardStep(0);
    if (!listening) {
      shell.send("toggleChunkManager", true);
      setAutoEnabledListening(true);
    } else {
      setAutoEnabledListening(false);
    }
    setWizardOpen(true);
  };

  const abortGuidedWizard = (): void => {
    if (runningAutoVerify) {
      return;
    }
    if (autoEnabledListening && listening) {
      shell.send("toggleChunkManager", false);
    }
    setAutoEnabledListening(false);
    setWizardOpen(false);
  };

  const completeGuidedEnrollment = (): void => {
    setGuidedFlowCompleted(true);
    setCaptureStarted(true);
    setVerificationRun(true);
    setRunningAutoVerify(true);
    shell.send("securityEnrollAndVerify", displayName);
    window.setTimeout(() => {
      shell.send("securityRefreshStatus");
      if (autoEnabledListening && listening) {
        shell.send("toggleChunkManager", false);
      }
      setAutoEnabledListening(false);
      setRunningAutoVerify(false);
      setWizardOpen(false);
    }, 900);
  };

  return (
    <div className="px-4 pb-4">
      <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-3 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-200 mb-1">Voice Enrollment Wizard</h2>
        <p className="text-xs text-cyan-100/80">
          Use Voice Wizard for first-time setup and reenrollment. Keep Security tab for runtime diagnostics.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <StepChip active={suggestedStep === 1} done={consentChecked} title="1 Consent" />
        <StepChip active={suggestedStep === 2} done={preflightPass} title="2 Preflight" />
        <StepChip active={suggestedStep === 3} done={capturePass} title="3 Capture" />
        <StepChip active={suggestedStep === 4} done={verifyPass} title="4 Verify" />
        <StepChip active={suggestedStep === 5} done={capturePass && verifyPass} title="5 Complete" />
      </div>

      <div className="border border-white/10 rounded-lg p-3 mb-3 bg-white/5">
        <h3 className="text-sm font-bold text-white/90 mb-1">Step 1: Consent</h3>
        <p className="text-xs text-white/60 mb-2">
          I understand voice enrollment stores local biometric profile data for command authorization gating.
        </p>
        <label className="inline-flex items-center gap-2 text-xs text-white/80">
          <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
          Consent acknowledged
        </label>
      </div>

      <div className="border border-white/10 rounded-lg p-3 mb-3 bg-white/5">
        <h3 className="text-sm font-bold text-white/90 mb-1">Step 2: Preflight</h3>
        <div className="text-xs text-white/70">WeSpeaker provider: {securityVerificationProviderReady ? "Ready" : "Unavailable"}</div>
        <div className="text-xs text-white/70">Diarization provider: {securityDiarizationProviderReady ? "Ready" : "Unavailable"}</div>
        <div className="text-xs text-white/70">Contamination state: {securityContaminated ? "Detected" : "Clean"}</div>
        {!securityVerificationProviderReady && securityVerificationProviderError ? (
          <div className="text-xs text-orange-300 mt-1">WeSpeaker error: {securityVerificationProviderError}</div>
        ) : null}
        {!securityDiarizationProviderReady && securityDiarizationProviderError ? (
          <div className="text-xs text-orange-300 mt-1">Diarization error: {securityDiarizationProviderError}</div>
        ) : null}
      </div>

      <div className="border border-white/10 rounded-lg p-3 mb-3 bg-white/5">
        <h3 className="text-sm font-bold text-white/90 mb-1">Step 3: Capture Enrollment</h3>
        <div className="flex gap-2 items-center mb-2">
          <input
            type="text"
            className="input flex-1 py-1"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enrollment profile name"
          />
          <button
            className="px-3 py-1 rounded bg-cyan-500/30 border border-cyan-300/50 text-cyan-100 text-xs uppercase tracking-widest disabled:opacity-50"
            disabled={!consentChecked || !preflightPass}
            onClick={openVoiceWizard}
          >
            Open Voice Wizard
          </button>
          <button
            className={`px-3 py-1 rounded border text-xs uppercase tracking-widest ${
              !consentChecked || !preflightPass || !guidedFlowCompleted
                ? "bg-white/5 border-white/15 text-white/40 cursor-not-allowed pointer-events-none"
                : "bg-cyan-500/20 border-cyan-400/40 text-cyan-200"
            }`}
            disabled={!consentChecked || !preflightPass || !guidedFlowCompleted}
            onClick={startEnrollment}
          >
            {enrollmentReady ? "Re-enroll" : "Start Enrollment"}
          </button>
        </div>
        {!guidedFlowCompleted ? (
          <div className="text-xs text-orange-300 mb-2">
            Complete Voice Wizard before Start Enrollment is enabled.
          </div>
        ) : null}
        <div className="text-xs text-white/70">Enrollment status: {enrollmentReady ? "Active" : "Not Enrolled"}</div>
        {captureStarted && !enrollmentReady ? (
          <div className="text-xs text-orange-300 mt-1">
            Capture started, but enrollment is not active yet. Check Security tab provider/errors.
          </div>
        ) : null}
      </div>

      <div className="border border-white/10 rounded-lg p-3 mb-3 bg-white/5">
        <h3 className="text-sm font-bold text-white/90 mb-1">Step 4: Verify</h3>
        <button
          className="px-3 py-1 rounded bg-white/5 border border-white/20 text-white/80 text-xs uppercase tracking-widest disabled:opacity-50"
          disabled={!enrollmentReady || runningManualVerify}
          onClick={runVerification}
        >
          {runningManualVerify ? "Running Verification..." : "Test Verification"}
        </button>
        <div className="text-xs text-white/70 mt-2">
          Verification status: {securityIsVerified ? "Verified" : "Unverified"}
        </div>
        {manualVerifyAt ? (
          <div className="text-xs text-cyan-200/80 mt-1">
            Last test run: {manualVerifyAt}
          </div>
        ) : null}
        {manualVerifyNote ? (
          <div className="text-xs text-cyan-200/80 mt-1">{manualVerifyNote}</div>
        ) : null}
        <div className="text-xs text-white/70 mt-2">
          Last authorization decision: {securityLastAuthorizationDecision || "n/a"}
        </div>
        <div className="text-xs text-white/60">Reason: {securityLastAuthorizationReason || "n/a"}</div>
        {verificationRun && !verifyPass ? (
          <div className="text-xs text-orange-300 mt-1">Verification not complete yet. Re-run after speaking clearly.</div>
        ) : null}
      </div>

      <div className="border border-emerald-400/30 rounded-lg p-3 bg-emerald-500/10">
        <h3 className="text-sm font-bold text-emerald-200 mb-1">Step 5: Completion</h3>
        <div className="text-xs text-emerald-100/90">
          {capturePass
            ? "Enrollment is active. Use Security tab for live identity and policy diagnostics."
            : "Complete Steps 1–4 to activate enrollment for high-risk command authorization."}
        </div>
      </div>

      {wizardOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-cyan-400/40 bg-slate-900 shadow-2xl">
            <div className="px-4 py-3 border-b border-white/10 flex items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-200">
                Voice Wizard Enrollment
              </h3>
              <button
                className="ml-auto text-xs text-white/60 hover:text-white"
                onClick={abortGuidedWizard}
                disabled={runningAutoVerify}
              >
                Abort
              </button>
            </div>

            <div className="px-4 py-4">
              <p className="text-xs text-white/70 mb-3">
                Say each command out loud. Keep a steady pace and avoid overlapping speakers.
              </p>
              <p className="text-[11px] text-cyan-200/80 mb-3">
                Listening mode is automatically enabled while this wizard is open.
              </p>
              <div className="text-[11px] text-white/50 mb-3">
                Prompt {wizardStep + 1} / {guidedSentences.length}
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-4 mb-4">
                <div className="text-sm leading-relaxed flex flex-wrap gap-1">
                  {expectedWords.map((word, idx) => {
                    const glowed = phraseMatched;
                    return (
                      <span
                        key={`${wizardStep}-${idx}-${word}`}
                        className={`px-1.5 py-0.5 rounded transition-all duration-200 ${
                          glowed
                            ? "bg-cyan-400/30 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.45)]"
                            : "bg-white/5 text-white/80"
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="w-full h-2 rounded bg-white/10 overflow-hidden mb-4">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{
                    width: `${phraseMatched ? 100 : 0}%`,
                  }}
                />
              </div>
              <div className="text-[11px] text-white/60 mb-4">
                Progress: {phraseMatched ? "Phrase matched" : "Waiting for full phrase match"}
              </div>
              <div className="text-[11px] text-white/50 mb-4">
                Heard: {liveAlternativePhrase || "n/a"}
              </div>

              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded border border-white/20 text-white/70 text-xs uppercase tracking-widest disabled:opacity-50"
                  disabled={wizardStep === 0 || runningAutoVerify}
                  onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                >
                  Back
                </button>
                {wizardStep < guidedSentences.length - 1 ? (
                  <button
                    className="px-3 py-1 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs uppercase tracking-widest disabled:opacity-50"
                    disabled={runningAutoVerify || !sentenceComplete}
                    onClick={() => setWizardStep((s) => Math.min(guidedSentences.length - 1, s + 1))}
                  >
                    Next Sentence
                  </button>
                ) : (
                  <button
                    className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs uppercase tracking-widest disabled:opacity-50"
                    disabled={runningAutoVerify || !sentenceComplete}
                    onClick={completeGuidedEnrollment}
                  >
                    {runningAutoVerify ? "Enrolling + Verifying..." : "Complete + Auto Verify"}
                  </button>
                )}
              </div>
              <div className="text-[11px] text-white/50 mt-3">
                Next sentence unlocks only after the full sentence glows. After completion, Maestro auto-runs Test Verification.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const EnrollmentWizard = connect((state: any) => ({
  securityEnrollmentActive: state.securityEnrollmentActive,
  securityEnrollmentStatus: state.securityEnrollmentStatus,
  securityEnrollmentName: state.securityEnrollmentName,
  securityVerificationProviderReady: state.securityVerificationProviderReady,
  securityDiarizationProviderReady: state.securityDiarizationProviderReady,
  securityVerificationProviderError: state.securityVerificationProviderError,
  securityDiarizationProviderError: state.securityDiarizationProviderError,
  securityContaminated: state.securityContaminated,
  securityIsVerified: state.securityIsVerified,
  securityLastAuthorizationDecision: state.securityLastAuthorizationDecision,
  securityLastAuthorizationReason: state.securityLastAuthorizationReason,
  listening: state.listening,
  alternatives: state.alternatives || [],
  suggestion: state.suggestion || "",
}))(EnrollmentWizardComponent);
