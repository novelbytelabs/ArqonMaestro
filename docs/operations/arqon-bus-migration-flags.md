# Arqon Bus Migration Flags

## Configuration Reference

All migration-related configuration flags for the Arqon Bus STT migration.

## Bus Core Settings

### `arqon_bus_enabled`

- **Type**: Boolean
- **Default**: `false`
- **Description**: Master enable switch for Arqon Bus integration
- **When to change**: Enable when ready to begin migration testing
- **Example**:
  ```typescript
  settings.setArqonBusEnabled(true);
  ```

### `arqon_bus_ws_url`

- **Type**: String
- **Default**: `"ws://localhost:9100"`
- **Description**: WebSocket URL for Arqon Bus server
- **When to change**: Point to production Bus server
- **Example**:
  ```typescript
  settings.setArqonBusWsUrl("wss://bus.arqon.ai");
  ```

### `arqon_bus_shadow_mode`

- **Type**: Boolean
- **Default**: `true`
- **Description**: When enabled, messages are published to Bus but responses are not acted upon
- **When to change**: 
  - Keep `true` during shadow and comparison phases
  - Set to `false` when Bus path is primary
- **Example**:
  ```typescript
  settings.setArqonBusShadowMode(false);  // Act on Bus responses
  ```

### `arqon_bus_room`

- **Type**: String
- **Default**: `"stt"`
- **Description**: Room name for STT traffic on Bus
- **When to change**: Only if using custom room naming
- **Example**:
  ```typescript
  settings.setArqonBusRoom("stt-prod");
  ```

### `arqon_bus_channel`

- **Type**: String
- **Default**: `"transcription"`
- **Description**: Channel name for transcription messages
- **When to change**: Only if using custom channel naming
- **Example**:
  ```typescript
  settings.setArqonBusChannel("stt-transcription");
  ```

## Comparison Settings

### `arqon_bus_compare_enabled`

- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable comparison mode to compare WebSocket vs Bus responses
- **When to change**: Enable during shadow phase to validate parity
- **Example**:
  ```typescript
  settings.setArqonBusCompareEnabled(true);
  ```

### `arqon_bus_compare_threshold`

- **Type**: Number (0-1)
- **Default**: `0.95`
- **Description**: Similarity threshold for considering transcripts as matching
- **When to change**: Adjust based on acceptable transcript variance
- **Example**:
  ```typescript
  settings.setArqonBusCompareThreshold(0.90);  // More lenient
  ```

### `arqon_bus_compare_report_interval_s`

- **Type**: Number (seconds)
- **Default**: `300`
- **Description**: Interval for generating comparison reports
- **When to change**: 
  - Decrease for more frequent reports during validation
  - Increase for production to reduce log volume
- **Example**:
  ```typescript
  settings.setArqonBusCompareReportInterval(60);  // Every minute
  ```

### `arqon_bus_compare_sample_rate`

- **Type**: Number (0-1)
- **Default**: `1.0`
- **Description**: Percentage of sessions to compare (1.0 = 100%)
- **When to change**: Reduce to lower comparison overhead in production
- **Example**:
  ```typescript
  settings.setArqonBusCompareSampleRate(0.1);  // 10% of sessions
  ```

## Cutover Settings

### `arqon_bus_cutover_enabled`

- **Type**: Boolean
- **Default**: `false`
- **Description**: Master switch for traffic cutover to Bus
- **When to change**: Enable to start routing traffic to Bus
- **Example**:
  ```typescript
  settings.setArqonBusCutoverEnabled(true);
  ```

### `arqon_bus_traffic_percentage`

- **Type**: Number (0-100)
- **Default**: `0`
- **Description**: Percentage of traffic to route to Bus path
- **When to change**: Increase gradually during staged rollout
- **Example**:
  ```typescript
  settings.setArqonBusTrafficPercentage(10);  // 10% of traffic
  ```

### `arqon_bus_current_stage`

- **Type**: String
- **Default**: `"shadow"`
- **Description**: Current rollout stage
- **Valid values**: `"shadow"`, `"1pct"`, `"10pct"`, `"50pct"`, `"100pct"`, `"rollback"`
- **When to change**: Update when advancing stages
- **Example**:
  ```typescript
  settings.setArqonBusCurrentStage("10pct");
  ```

### `arqon_bus_rollback_enabled`

- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable automatic rollback on critical thresholds
- **When to change**: Enable during production rollout
- **Example**:
  ```typescript
  settings.setArqonBusRollbackEnabled(true);
  ```

### `arqon_bus_stage_check_interval_s`

- **Type**: Number (seconds)
- **Default**: `60`
- **Description**: Interval for checking stage thresholds
- **When to change**: Adjust based on traffic volume
- **Example**:
  ```typescript
  settings.setArqonBusStageCheckInterval(30);  // Check every 30 seconds
  ```

## Production Defaults

After final cutover, set these values:

```typescript
{
  "arqon_bus_enabled": true,
  "arqon_bus_shadow_mode": false,
  "arqon_bus_traffic_percentage": 100,
  "arqon_bus_current_stage": "100pct",
  "arqon_bus_cutover_enabled": true,
  "arqon_bus_compare_enabled": false,  // Disable comparison in production
  "arqon_bus_rollback_enabled": true,
  "arqon_bus_stage_check_interval_s": 300
}
```

## Stage Configuration

| Stage | Traffic % | Min Sessions | Max Error Rate | Max Latency Delta | Min Match Rate |
|-------|-----------|--------------|----------------|-------------------|----------------|
| shadow | 0 | 0 | 0 | 0 | 0 |
| 1pct | 1 | 50 | 2% | 1000ms | 90% |
| 10pct | 10 | 200 | 1% | 750ms | 93% |
| 50pct | 50 | 500 | 0.5% | 500ms | 95% |
| 100pct | 100 | 1000 | 0.1% | 500ms | 98% |

## Runtime Configuration via TrafficRouter

The TrafficRouter provides direct API access:

```typescript
// Get current config
router.getConfig();
// { enabled, busPercentage, currentStage, rollbackEnabled, ... }

// Set traffic percentage directly
router.setBusPercentage(50);

// Promote to next stage
router.promoteToStage("10pct");

// Trigger rollback
router.manualRollback("reason for rollback");

// Enable/disable cutover
router.setEnabled(true);

// Get detailed metrics
router.getDetailedMetrics();
// { config, metrics, stages, stageConfigs }
```

## Monitoring Settings

For production monitoring, these metrics are automatically tracked:

- `stt.bus.messages_published` - Total messages sent to Bus
- `stt.bus.messages_received` - Total responses received
- `stt.bus.connection_errors` - Connection failure count
- `stt.cutover.routing` - Routing decisions
- `stt.cutover.session.result` - Session outcomes
- `stt.cutover.stage.promotion` - Stage changes
- `stt.cutover.rollback` - Rollback events
- `stt.comparison.*` - Comparison metrics

## Flag Change Best Practices

1. **Test changes in lower environments first**
2. **Log all flag changes** with timestamp and reason
3. **Use gradual changes** - don't jump from 0% to 100%
4. **Monitor after changes** - wait at least 5 minutes
5. **Keep rollback plan ready** - know how to revert quickly
6. **Document exceptions** - note why non-standard values were used
