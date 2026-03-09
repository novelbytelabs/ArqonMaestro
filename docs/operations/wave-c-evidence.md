# Wave C Evidence Pack

This evidence pack records the verification used to hard-close `Wave C: Packaging And Distribution`.

## Evidence Directory

- `reports/wave-c_20260309T154457Z`

## Verification Results

### 1. Release Readiness Gate

- **Command**: `maestro/scripts/release_readiness_check.sh`
- **Result**: passed
- **Evidence log**: `reports/wave-c_20260309T154457Z/readiness.log`
- **Observed outcomes**:
  - Node `v18.20.8` verified
  - Linux packaging prerequisites verified (`libxtst-dev`, `libx11-dev`, `libxext-dev`)
  - Electron binary present
  - local service runners and binaries present + executable

### 2. Desktop Unsigned Packaging

- **Command**: `cd maestro/client && npm run package:unsigned`
- **Result**: passed
- **Evidence log**: `reports/wave-c_20260309T154457Z/client_package_unsigned.log`
- **Observed outcomes**:
  - linux package flow completed through AppImage squashfs step
  - produced `dist/ArqonMaestro-2.0.2.AppImage`

### 3. Artifact Integrity And Inventory

- **Commands**:
  - `ls -lah maestro/client/dist`
  - `file maestro/client/dist/ArqonMaestro-2.0.2.AppImage`
  - `sha256sum maestro/client/dist/ArqonMaestro-2.0.2.AppImage`
- **Results**: passed
- **Evidence logs**:
  - `reports/wave-c_20260309T154457Z/dist_listing.log`
  - `reports/wave-c_20260309T154457Z/appimage_file.log`
  - `reports/wave-c_20260309T154457Z/appimage_sha256.log`
- **Observed outcomes**:
  - AppImage present (`871M`)
  - file type: ELF executable
- sha256: `a6f7ba7609dcd440b2bdc08d2fe639ca1f561ce417303a0e6371de983d992989`

### 4. linux-unpacked Smoke Launch

- **Command**: `cd maestro/client/dist/linux-unpacked && timeout 12 ./arqon-maestro`
- **Mode control**: executed via `scripts/with_clean_electron_env.sh`
- **Result**: passed as smoke launch
- **Evidence log**: `reports/wave-c_20260309T154457Z/linux_unpacked_smoke.log`
- **Observed outcomes**:
  - process starts and emits normal Electron startup warnings
  - host snap `libgiolibproxy` warning appears (known host-level warning)

### 5. VS Code Extension Packaging Path

- **Commands**:
  - `cd vscode-plugin && npm install`
  - `cd vscode-plugin && npm run build`
  - `cd vscode-plugin && npm pack --dry-run`
- **Results**: passed
- **Evidence logs**:
  - `reports/wave-c_20260309T154457Z/vscode_install.log`
  - `reports/wave-c_20260309T154457Z/vscode_build.log`
  - `reports/wave-c_20260309T154457Z/vscode_pack_dry_run.log`
- **Observed outcomes**:
  - extension bundle compiled successfully
  - package dry-run produced `arqon-maestro-1.5.3.tgz`

## Wave C Verdict

Wave C exit criteria are met for the current environment baseline:

1. readiness gate passes
2. desktop artifact path is repeatable
3. unpacked artifact launches in smoke mode
4. extension packaging path is validated
5. evidence pack is published

## Residual Risks

- inherited update endpoint metadata still points to legacy external infrastructure; ownership transfer is deferred to Wave D
- host snap `libgiolibproxy` warning is environmental noise, not a packaging blocker
- vulnerability counts reported by npm audit were not remediated in Wave C due to frozen-lane constraints
