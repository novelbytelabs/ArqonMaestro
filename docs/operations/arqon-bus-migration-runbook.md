# Arqon Bus Migration Runbook

## Overview

This runbook documents the procedures for rollout, rollback, and troubleshooting of the Arqon Bus STT migration.

## Migration Stages

| Stage | Traffic % | Description | Duration |
|-------|------------|-------------|----------|
| Shadow | 0% | Mirror traffic to Bus, don't act on responses | 24-48 hours |
| 1pct | 1% | 1% of traffic to Bus path | 4-24 hours |
| 10pct | 10% | 10% of traffic to Bus path | 4-24 hours |
| 50pct | 50% | 50% of traffic to Bus path | 4-24 hours |
| 100pct | 100% | Full cutover to Bus | Ongoing |

## Prerequisites

Before starting migration:

- [ ] Arqon Bus service is running and healthy
- [ ] WebSocket STT path is stable
- [ ] Monitoring dashboards are accessible
- [ ] On-call personnel are notified
- [ ] Rollback procedure has been reviewed

## Rollout Procedure

### Stage 1: Enable Shadow Mode

```bash
# Enable Arqon Bus in settings
settings.setArqonBusEnabled(true)
settings.setArqonBusShadowMode(true)
settings.setArqonBusCompareEnabled(true)
```

1. Verify Bus client connects successfully
2. Monitor `stt.bus.messages_published` metric
3. Monitor `stt.bus.messages_received` metric
4. Run regression tests (see below)
5. Verify comparison reports show >90% match rate

### Stage 2: Gradual Traffic Increase

Proceed through stages in order: 1pct → 10pct → 50pct → 100pct

For each stage:

```bash
# Set traffic percentage
settings.setArqonBusTrafficPercentage(1)  # or 10, 50, 100
settings.setArqonBusCurrentStage("1pct")
settings.setArqonBusCutoverEnabled(true)
```

1. Monitor error rate - should stay below 1%
2. Monitor P95 latency - should stay below 500ms
3. Monitor match rate - should stay above 95%
4. Check for stuck listening incidents
5. Run regression tests after each stage
6. Wait minimum 4 hours between stages

### Stage 3: Final Cutover

```bash
# Set to 100% traffic
settings.setArqonBusTrafficPercentage(100)
settings.setArqonBusCurrentStage("100pct")
settings.setArqonBusCutoverEnabled(true)

# Monitor for 1 hour, then optionally:
settings.setArqonBusShadowMode(false)
```

## Rollback Procedure

### Immediate Rollback (Post-Cutover)

If issues are detected after final cutover:

```bash
# Instant rollback - all traffic returns to WebSocket
settings.setArqonBusTrafficPercentage(0)
settings.setArqonBusCutoverEnabled(false)
settings.setArqonBusCurrentStage("rollback")
```

All traffic immediately routes to WebSocket path.

### Gradual Rollback

For issues detected during gradual rollout:

```bash
# Step back one stage
settings.setArqonBusTrafficPercentage(10)  # from 50 to 10
settings.setArqonBusCurrentStage("10pct")

# Or disable cutover entirely
settings.setArqonBusCutoverEnabled(false)
```

### Manual Rollback via Traffic Router

```typescript
// Via TrafficRouter API
router.manualRollback("description of issue");

// Or trigger via settings change
settings.setArqonBusRollbackEnabled(true);
```

## Troubleshooting Guide

### Bus Connection Issues

**Symptom**: Bus client not connecting

Diagnosis:
```bash
# Check connection state
busClient.getConnectionState()  # should be "connected"

# Check metrics
busClient.getMetrics().connectionErrors

# Check logs for errors
grep "BusClient" logs/arqon.log
```

Solutions:
1. Verify Bus WebSocket URL is correct
2. Check network connectivity to Bus server
3. Verify Bus server is running
4. Check authentication credentials
5. Restart Bus client: `busClient.disconnect(); busClient.connect();`

### High Error Rate

**Symptom**: Error rate exceeds threshold

Diagnosis:
```bash
# Check current error rate
router.getMetrics().errorRate

# Check stage-specific errors
router.getStageMetrics(currentStage)

# Review logs for error patterns
grep "error" logs/arqon.log | tail -50
```

Solutions:
1. Check Bus service health
2. Review recent deployments
3. Check for network issues
4. Enable shadow mode temporarily
5. Rollback to previous stage

### Latency Regression

**Symptom**: P95 latency exceeds 500ms threshold

Diagnosis:
```bash
# Check latency metrics
router.getStageMetrics(currentStage).avgLatencyMs

# Compare WebSocket vs Bus latency
router.getDetailedMetrics().stages[currentStage].avgWebsocketLatencyMs
router.getDetailedMetrics().stages[currentStage].avgLatencyMs
```

Solutions:
1. Check Bus service load
2. Review network latency
3. Check for processing backlogs
4. Consider returning to previous stage

### Transcript Mismatches

**Symptom**: Match rate below threshold

Diagnosis:
```bash
# Get comparison report
comparator.generateReport()

# Review recent mismatches
grep "mismatch" logs/arqon.log
```

Solutions:
1. Compare transcript differences
2. Adjust similarity threshold if needed
3. Review audio quality issues
4. Check for timing issues between paths

### Stuck Listening

**Symptom**: User stuck in listening state

Diagnosis:
```bash
# Check for stuck listening incidents
tracking.getSessionMetrics().stuck_listening

# Check active sessions
tracking.getCurrentSessionId()
```

Solutions:
1. User can press Escape to cancel
2. Restart the listening session
3. Check for network issues
4. Review endpoint detection logic

### Memory Leaks

**Symptom**: Memory usage growing over time

Diagnosis:
```bash
# Monitor memory samples
soakTester.getMemorySamples()

# Check heap growth
soakTester.checkMemoryLeaks()
```

Solutions:
1. Restart application periodically
2. Check for WebSocket cleanup issues
3. Review event listener cleanup
4. Check for accumulating buffers

## Regression Tests

Run regression tests at each stage:

```bash
# Run all regression tests
regressionRunner.runAll()

# Expected scenarios:
# - Normal operation: start/stop, partial/final
# - Pause/Resume: rapid toggle
# - Reconnect: network drop
# - Duplicate handling: same session
# - Out-of-order: delayed messages
# - Malformed: invalid envelopes
# - Replay: re-sent messages
# - Command execution: verify commands
```

## Monitoring Dashboards

Key metrics to monitor:

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| `stt.bus.messages_published` | N/A | Messages sent to Bus |
| `stt.bus.messages_received` | N/A | Responses from Bus |
| `stt.bus.connection_errors` | > 0 | Connection failures |
| `stt.cutover.error_rate` | > 1% | Session error rate |
| `stt.cutover.latency.p95` | > 500ms | P95 latency |
| `stt.comparison.match_rate` | < 95% | Transcript match |
| `stt.state.stuck_listening` | > 0 | Stuck incidents |

## Configuration Reference

See [arqon-bus-migration-flags.md](arqon-bus-migration-flags.md) for all configuration options.

## Emergency Contacts

- **Arqon Bus Service**: Check service health dashboard
- **STT Backend**: Check WebSocket endpoint status
- **On-Call**: PagerDuty rotation

## Quick Reference Commands

```bash
# Enable Bus
settings.setArqonBusEnabled(true)

# Start shadow mode
settings.setArqonBusShadowMode(true)
settings.setArqonBusCompareEnabled(true)

# Set traffic percentage
settings.setArqonBusTrafficPercentage(5)  # 5%

# Enable cutover
settings.setArqonBusCutoverEnabled(true)

# Rollback
settings.setArqonBusTrafficPercentage(0)
settings.setArqonBusCutoverEnabled(false)

# Check status
router.getMetrics()
comparator.generateReport()
busClient.getMetrics()
```

## Pre-Flight Checklist

Before each stage increase:

- [ ] Previous stage error rate < 1%
- [ ] Previous stage latency P95 < 500ms
- [ ] Match rate > 95%
- [ ] No stuck listening incidents in past hour
- [ ] Regression tests passing
- [ ] On-call personnel notified
- [ ] Rollback procedure reviewed
