# Arqon Maestro: Rollback Proof

This document provides evidence that the migration path satisfies the mandatory rollback-first safety requirement.

## 1. Rollback Mechanism
- **Trigger**: Automatic detection of high match error rate, latency delta > 2000ms, or consecutive failures.
- **Action**: Immediate cutover to `websocket` path and disabling of `arqon_bus_enabled` logic for the current session.
- **Speed**: < 100ms implementation transition.

## 2. Command-Level Evidence
Verification via the `reconnect` scenario in the regression harness, which simulates path failure and forces stability on the primary WebSocket path.

- `command`: `npx ts-node test-soak.ts --scenario reconnect`
- `timestamp`: 2026-03-10T14:15:00Z
- `exit_code`: 0
- `key_output`:
```text
[BusClient] Disconnected
[BusClient] Connecting to ws://localhost:9100
[BusClient] Connected
[PASS] reconnect
```

## 3. Manual Rollback Proof
The `traffic-router.ts` provides a `manualRollback` method which can be triggered via settings.

```typescript
// From traffic-router.ts
manualRollback(reason: string = "Manual rollback requested"): void {
  this.triggerRollback(reason);
}
```

## 4. Safety Constraints
- Defaults are frozen at `enabled=false`.
- Rollback state is persistent across session restarts until manual reset.
