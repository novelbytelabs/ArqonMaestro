# Maestro Command Platform: Engine Hierarchy and Control Ownership

## 1. Identity

Arqon Maestro is a command platform, not an app consuming one ASR API.

Maestro owns:

- command language
- grammar/compiler
- lexicon/pronunciation controls
- safety and routing policy
- telemetry/provenance contracts

Engines are subordinate adapters.

## 2. Engine Hierarchy

### 2.1 Command-Control Authority Rail

Kaldi/Vosk-class control mechanisms anchor bounded command behavior and customization guarantees.

### 2.2 Acoustic Modernization Rail

`Parakeet-CTC`-class acoustic front ends modernize perception quality and latency.

This rail does not own command semantics.

### 2.3 Dictation Rail (Separate)

Dictation providers (for example `Qwen3-ASR`) are accuracy-first and isolated from command authority.

## 3. Rust Adjudication Orchestrator

The Rust hot path adjudicates between adapters and policy constraints:

1. ingest and route audio by lane
2. combine confidence and policy signals
3. escalate disagreement/risk to chooser or refusal
4. preserve deterministic failure modes for unsafe ambiguity

## 4. Shared Customization Compilation

Operator customizations compile into engine-specific artifacts through Maestro-owned structures.

| Asset | Command adapter target | Control rail target |
| :--- | :--- | :--- |
| command alias | decoder vocabulary + parser rules | lexicon + grammar graph updates |
| pronunciation | lexicon mapping | lexicon/FST updates |
| grammar template | bounded parser structures | composed grammar graph |
| workflow intent | runtime command contract | ArqonMCP orchestration request + policy/routing constraints |

## 5. Strategic Rule

No adapter may redefine command-lane legality. Legality remains defined by Maestro grammar/parser/policy services.

## 6. Conclusion

The command lane remains platform-governed while acoustic adapters evolve. This preserves sovereignty, determinism, and operator-safe behavior.
