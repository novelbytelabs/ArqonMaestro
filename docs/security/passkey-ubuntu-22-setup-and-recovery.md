# Ubuntu 22.04 Passkey Setup and Recovery (Maestro)

Date: 2026-03-22  
Audience: Local operator on Ubuntu 22.04 who is locked out or needs passkey bootstrap working

## Direct answer

Yes, there is a path to use Maestro on Ubuntu 22.04 right now.

- Immediate unblock path: use runtime gate controls and clear stale runtime snapshot if needed.
- Passkey bootstrap path: use the extension/provider-outcome flow (`securityBeginPasskeyProviderChallenge` + `securityReportPasskeyProviderOutcome`) and confirm bridge ack/state transitions.

Current product status in this slice:

- Strict lock behavior is active when passkey bootstrap is required and unsatisfied.
- Full end-user one-click passkey wizard UX is still in rollout; provider-outcome bridge path is the working authority path.

## 1) Immediate unblock (2-5 minutes)

From your shell before launching Maestro:

```bash
# Option A: temporary unblock for local recovery session
export ARQON_PASSKEY_BOOTSTRAP_REQUIRED=0

# Optional: keep provider readiness visible but non-blocking in this session
export ARQON_PASSKEY_PROVIDER_READY=1
```

Then restart Maestro.

If UI still looks split-brain or stale, reset runtime snapshot:

```bash
mkdir -p ~/.arqon
cp ~/.arqon/security-runtime-state.json ~/.arqon/security-runtime-state.backup.$(date +%s).json 2>/dev/null || true
rm -f ~/.arqon/security-runtime-state.json
```

Restart Maestro again and verify in `Settings -> Security`:

- `Bootstrap blocked: No`
- `Effective policy mode` is not forced to `locked` by passkey

## 2) Turn strict lock back on (required for passkey-gated operation)

After recovery, re-enable strict startup gate:

```bash
export ARQON_PASSKEY_BOOTSTRAP_REQUIRED=1
export ARQON_PASSKEY_PROVIDER_READY=1
```

Restart Maestro and confirm:

- If not yet bootstrapped, `Effective policy mode: locked`
- `Lock reason: passkey_required`

## 3) Passkey bootstrap authority flow (current supported path)

The active authority path is provider outcome through extension + bus correlation:

1. Start passkey challenge in extension/runtime (`securityBeginPasskeyProviderChallenge`).
2. Complete/fail provider challenge.
3. Extension reports result with `securityReportPasskeyProviderOutcome`.
4. Desktop/plugin bus returns correlated `securityReportPasskeyProviderOutcomeAck` (matching `requestId`).
5. Security state refresh shows bootstrap transition.

Success expectation:

- `securityPasskeyBootstrapped=true`
- `securityPasskeyBootstrapBlocked=false`
- `securityPasskeyBootstrapMethod=passkey` (or policy-approved method)
- `securityPasskeyLastProviderOutcome=verified`

Failure expectation:

- Still blocked/locked with reason-coded provider outcome telemetry

## 4) If still locked after passkey attempt

Check these first:

1. Env mismatch:
   - `echo "$ARQON_PASSKEY_BOOTSTRAP_REQUIRED"`
   - `echo "$ARQON_PASSKEY_PROVIDER_READY"`
2. Stale snapshot:
   - remove `~/.arqon/security-runtime-state.json` and restart
3. Correlated ack missing:
   - provider outcome sent but no matching `securityReportPasskeyProviderOutcomeAck`
   - this is a known hard-close blocker for some adversarial scenarios (S01/S02/S05/S06/S07)

## 5) Evidence checklist for local acceptance

Capture these after your next run:

1. Security tab screenshot with:
   - passkey bootstrap fields
   - session policy bridge fields
2. Mini window screenshot (mode chip)
3. Env values used for the run (`ARQON_PASSKEY_BOOTSTRAP_REQUIRED`, `ARQON_PASSKEY_PROVIDER_READY`)
4. Timestamp + active profile name

## Related docs

- `docs/security/passkey-lockout-unblock-runbook.md`
- `docs/security/session-bootstrap-root-trust.md`
- `docs/browser/maestro-chrome-extension-ai-handoff-b2-a1-hard-close.md`
