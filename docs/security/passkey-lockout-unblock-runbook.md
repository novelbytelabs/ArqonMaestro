# Passkey Lockout Unblock Runbook

Date: 2026-03-22  
Scope: Local operator recovery for Maestro lockout/mode mismatch during Program B B2 rollout

## Purpose

Use this runbook when the UI appears locked/inconsistent (for example mini shows locked while Security tab shows assist), or when passkey bootstrap state is stale after restart.

## 1) Inspect runtime env gates

From the repository root:

```bash
echo "ARQON_PASSKEY_BOOTSTRAP_REQUIRED=${ARQON_PASSKEY_BOOTSTRAP_REQUIRED}"
echo "ARQON_PASSKEY_PROVIDER_READY=${ARQON_PASSKEY_PROVIDER_READY}"
```

Expected:

- `ARQON_PASSKEY_BOOTSTRAP_REQUIRED=1` means cold-start passkey gate is active.
- If unset or `0`, passkey bootstrap is informational and should not lock runtime by itself.

## 2) Locate runtime persistence snapshot

On Ubuntu this is typically:

`~/.arqon/security-runtime-state.json`

In app code this is resolved via `App.securityRuntimeStateFile()`.

## 3) Safe reset of stale runtime state

If policy state appears stale or contradictory across screens:

1. Stop Maestro fully.
2. Back up the snapshot:

```bash
cp ~/.arqon/security-runtime-state.json ~/.arqon/security-runtime-state.backup.$(date +%s).json
```

3. Remove the active snapshot:

```bash
rm -f ~/.arqon/security-runtime-state.json
```

4. Restart Maestro and open Settings -> Security.

## 4) Verify expected matrix after restart

Check these combinations in Security tab:

1. `required=true`, `bootstrapped=false`:
   - `securityPasskeyBootstrapBlocked` = `Yes`
   - Effective mode = `locked`
   - Lock reason = `passkey_required`
2. `required=true`, `bootstrapped=true`:
   - `securityPasskeyBootstrapBlocked` = `No`
   - Effective mode follows base policy mode or active unknown-rate/manual lock
3. `required=false`, `bootstrapped=false`:
   - `securityPasskeyBootstrapBlocked` = `No`
   - Effective mode should not be forced locked by passkey

## 5) Evidence capture checklist

Capture after unblock:

1. Screenshot of Security -> Passkey bootstrap + Session policy bridge.
2. Screenshot of mini mode (mode label).
3. Short note with current env gate values.
4. Timestamp and profile id/display name used.

## 6) Quick local recovery toggle (optional)

If you must regain access immediately for local recovery:

```bash
export ARQON_PASSKEY_BOOTSTRAP_REQUIRED=0
```

Restart Maestro, recover state, then restore strict mode (`ARQON_PASSKEY_BOOTSTRAP_REQUIRED=1`) for passkey-gated operation.
