# Maestro Master Plan Wave 2 Evidence

This evidence pack records the hard-close state for `Maestro Master Plan Wave 2: Shell Contract And Operator Model`.

## Scope Covered

- introduced a concrete renderer shell contract
- isolated raw Electron IPC to the shell adapter layer
- moved renderer pages and components onto the shell API
- defined the practical operator-facing model the next GUI work should depend on
- preserved the current Electron host as the compatibility path through the new contract

## Evidence Artifacts

- [Maestro Master Plan](../overview/maestro-master-plan.md)
- [Renderer Shell Contract](../development/renderer-shell-contract.md)
- [Wave 2 Closeout](maestro-master-plan-wave-2-closeout.md)
- [Decision Log](../decision-log.md)
- `maestro/client/src/renderer/shell/types.ts`
- `maestro/client/src/renderer/shell/electron-shell.ts`
- `maestro/client/src/renderer/events.ts`

## Verification Results

### 1. Renderer shell contract published

- **Artifact**: [Renderer Shell Contract](../development/renderer-shell-contract.md)
- **Result**: passed
- **Observed outcomes**:
  - one documented renderer-shell boundary now exists
  - the contract is explicitly framed as the GUI portability seam
  - the current operator-facing state and action surface is recorded without inventing fake future state

### 2. Raw Electron IPC isolated

- **Artifacts**:
  - `maestro/client/src/renderer/shell/electron-shell.ts`
  - `maestro/client/src/renderer/events.ts`
  - renderer pages and components under `maestro/client/src/renderer`
- **Result**: passed
- **Observed outcomes**:
  - raw `ipcRenderer` usage is isolated to the Electron shell adapter
  - renderer UI modules no longer send Electron events directly
  - the title-bar path now routes through the shell contract instead of relying on `window.location.href`

### 3. Current compatibility path preserved

- **Artifact**: `maestro/client/src/renderer/shell/electron-shell.ts`
- **Result**: passed
- **Observed outcomes**:
  - the current desktop host remains Electron-backed
  - the renderer now reaches it through a compatibility-safe adapter
  - the contract is ready for a future Tauri-backed implementation without rewriting renderer components

### 4. Build validation

- **Command**: `npm run build:renderer`
- **Result**: blocked by pre-existing generated-source gaps
- **Observed outcomes**:
  - the Wave 2 renderer-shell work does not add new direct `ipcRenderer` dependencies in renderer UI modules
  - renderer production build still depends on generated `src/gen/core` modules already missing elsewhere in the repo
  - this remains a separate pre-existing build-health issue, not a Wave 2 contract regression

### 5. Documentation build validation

- **Command**: `mkdocs build`
- **Result**: passed
- **Observed outcomes**:
  - Wave 2 docs are included so the shell contract and closeout are recorded as first-class artifacts
  - docs build succeeds with the same pre-existing non-nav and absolute-link warnings elsewhere in the repo

## Outcome

Wave 2 exit criteria are met for this cycle:

1. the renderer now depends on a shell-facing interface
2. raw Electron IPC is isolated to the adapter layer
3. the current operator model is defined in practical terms
4. Wave 3 can now build the GUI on top of this seam instead of more direct Electron coupling

## Residual Risks

- renderer build health still depends on restoring or regenerating missing `src/gen/core` modules
- transcript and TTS playback state still need later shell-surface expansion when live runtime support exists
- the Tauri adapter is still future work; only the portability seam is complete in Wave 2
