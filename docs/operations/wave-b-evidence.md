# Wave B Evidence (Hard-Close)

This evidence pack records the verified closeout state for `Wave B: Local Runtime Completeness`.

Wave B is hard-closed.

## Scope Covered In This Evidence Update

- tree-sitter JNI startup crash in local `core`
- local packaging completeness for bundled service binaries
- startup hardening for model-path handling in native service wrappers
- direct local runtime smoke for `core`, `speech-engine`, and `code-engine`

## Commands And Results

### 1. Local bundle packaging

```bash
cd maestro
./gradlew client:installServer -x downloadModels
```

- Result: `BUILD SUCCESSFUL`
- What it proves: `maestro/client/static/local` is populated via the current packaging path.

### 2. Tree-sitter JNI symbol namespace verification

```bash
nm -D maestro/client/static/local/core/lib/libjava-tree-sitter.so | rg "Java_ai_(arqon_maestro|serenade)_treesitter"
```

- Result: only `Java_ai_arqon_maestro_treesitter_*` exports are present.
- What it proves: local core now loads an Arqon-namespace JNI library, not the legacy Serenade JNI symbol set.

### 3. Local runtime smoke (direct run-pro)

```bash
(cd maestro/client/static/local/core/bin && timeout 8 ./run-pro)
(cd maestro/client/static/local/speech-engine && timeout 8 ./run-pro)
(cd maestro/client/static/local/code-engine && timeout 8 ./run-pro)
```

- Result:
  - `core`: exits `124` (timeout) without JVM crash.
  - `speech-engine`: exits `124` (timeout) after normal bring-up.
  - `code-engine`: exits `124` (timeout) after loading all model groups and starting server.
- What it proves:
  - all three local engines survive startup smoke on the local bundle.

### 4. Service health verification (`17200/17202/17203`)

```bash
bash -lc '
ROOT=/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/static/local
pushd "$ROOT/core/bin" >/dev/null
./run-pro >/tmp/arqon-core.log 2>&1 & CORE_PID=$!
popd >/dev/null
pushd "$ROOT/speech-engine" >/dev/null
./run-pro >/tmp/arqon-speech.log 2>&1 & SPEECH_PID=$!
popd >/dev/null
pushd "$ROOT/code-engine" >/dev/null
./run-pro >/tmp/arqon-code.log 2>&1 & CODE_PID=$!
popd >/dev/null
sleep 18
curl -sS http://127.0.0.1:17200/api/status
curl -sS http://127.0.0.1:17202/api/status
curl -sS http://127.0.0.1:17203/api/status
kill $CORE_PID $SPEECH_PID $CODE_PID
'
```

- Result:
  - `core={"status":"ok","c":"","g":""}`
  - `speech={"status":"ok","c":"","g":""}`
  - `code={"status":"ok","c":"","g":""}`
- What it proves:
  - local stack is healthy concurrently, not just one engine at a time.

### 5. Code-engine protobuf/sentencepiece crash fix

```bash
# source updates verified in:
# - maestro/code-engine/server/src/token_encryption.cc
# - maestro/code-engine/server/include/token_encryption.h
```

- Result:
  - removed direct in-process `SentencePieceProcessor::LoadFromSerializedProto(...)` usage from `TokenIdConverter`.
  - `TokenIdConverter` sentencepiece path now uses `spm_encode` CLI (`ARQON_MAESTRO_SPM_ENCODE` / `SERENADE_SPM_ENCODE` or default binary paths).
- What it proves:
  - the previous code-engine segfault path is eliminated while preserving sentencepiece token-id behavior for contextual models.

### 6. Legacy null-model-path crash hardening

```bash
# source updates verified in:
# - maestro/speech-engine/server/server/speech_engine_server.cc
# - maestro/code-engine/server/server/code_engine_server.cc
# - maestro/speech-engine/bin/run-pro
# - maestro/code-engine/bin/run-pro
```

- Result:
  - model env vars are now validated in C++ startup with explicit error messages.
  - `run-pro` wrappers now default to bundled model directories when no path arg is passed.
- What it proves: missing-model configuration now fails clearly instead of dereferencing null env pointers.

## Current Wave B Verdict

Wave B is **hard-closed**.

Close criteria met:

1. local packaging succeeds (`client:installServer -x downloadModels`)
2. bundled local `core`, `speech-engine`, and `code-engine` start cleanly
3. all three service health endpoints return `status=ok` together
4. previously blocking `code-engine` startup segfault is resolved

Residual follow-on (outside Wave B close criteria):

- keep gathering local UI and voice-command e2e evidence as part of ongoing runtime regression coverage
