# Docs Alignment Impact Audit (All `/docs` Subdirectories)

**Date:** 2026-03-25  
**Scope:** Full recursive audit of `docs/**`  
**Objective:** Assess impact of the updated Maestro alignment:

- Maestro as a **Voice Operating System** (VOS)
- command-lane primacy (governed control system)
- lane split clarity (command vs dictation)
- Parakeet-CTC repositioned as acoustic front end (not architecture owner)
- Kaldi/Vosk-class control ownership
- software talk-back / operational presence
- LLM wizard as customization asset designer (not truth source)
- mobile as future operator console, planned day 1 architecturally
- living/cybernetic frame as internal doctrine, VOS framing as public posture

---

## 1) Coverage Summary

- Files under `docs/`: **259**
- Markdown docs under `docs/`: **202**
- Non-markdown assets/scripts (`png`, `ico`, `js`, `css`, `html`, `sh`): **57**
- Markdown docs with direct thematic overlap (keyword-based): **147 / 202**

### Subdirectory Coverage (`.md` only)

| Subtree | Total | Theme-hit |
|---|---:|---:|
| `architecture` | 7 | 4 |
| `assets` | 1 | 0 |
| `browser` | 15 | 6 |
| `development` | 8 | 3 |
| `extensions` | 1 | 1 |
| `guides` | 15 | 6 |
| `models` | 3 | 3 |
| `operations` | 46 | 11 |
| `overview` | 2 | 2 |
| `parsing` | 1 | 1 |
| `plans` | 3 | 3 |
| `privacy-policy` | 2 | 2 |
| `reference` | 2 | 1 |
| `security` | 5 | 1 |
| `speech` | 3 | 3 |
| `strategy` | 2 | 2 |
| `ui` | 3 | 2 |
| `vision` | 3 | 3 |
| `vos` | 75 | 67 |
| Root docs (`index.md`, `decision-log.md`, etc.) | 5 | 4 |

---

## 2) Priority Tiers

## Tier A: Canonical Rewrite Required (Immediate)

These define external thesis, command-lane doctrine, and strategic framing.

1. `docs/vision/voice-operating-system.md`
2. `docs/vision/The_Living_Voice_Cybernetic_Maestro.md`
3. `docs/vision/ai-customization-wizard.md`
4. `docs/speech/lane-separation-strategy.md`
5. `docs/speech/command-engine-hierarchy.md`
6. `docs/speech/rust-hot-path-orchestration.md`
7. `docs/strategy/market-positioning-differentiation.md`
8. `docs/strategy/talon-compatibility-migration.md`
9. `docs/index.md`
10. `docs/vos/README.md`
11. `docs/vos/VOS_DOCUMENTATION_SORTING.md`
12. **New doc to add:** `docs/speech/command-lane-architecture-memo.md`

### Why Tier A is mandatory

- Public story, internal doctrine, and speech architecture are not yet fully synchronized around the same hierarchy.
- Current speech docs still contain command-lane framing that can be read as model-centric rather than command-platform-centric.
- Mobile architecture posture is mostly absent in canonical entry docs.
- The new canonical memo is still missing.

---

## Tier B: Synchronization Pass Required (High)

These are mostly aligned but must be updated/referenced so no contradictory phrasing remains.

1. `docs/decision-log.md`
2. `docs/vos/maestro-decision-log.md`
3. `docs/vos/maestro-asr-command-lane-pivot-impact.md`
4. `docs/vos/maestro-stt-strategy-by-lane.md`
5. `docs/vos/maestro-project-roadmap.md`
6. `docs/vos/maestro-master-plan.md`
7. `docs/vos/maestro-implementation-progress.md`
8. `docs/vos/maestro-voice-component-migration-matrix.md`
9. `docs/vos/ultimate-vos-reference-architecture.md`
10. `docs/architecture/ultimate-vos-reference-architecture.md`
11. `docs/architecture/maestro-actuation-and-control-stack.md`
12. `docs/overview/ecosystem.md`
13. `docs/overview/arqon-ecosystem-technotes.md`
14. `docs/plans/maestro-asr-command-lane-pivot-resume-plan-2026-03-23.md`
15. `docs/plans/maestro-asr-validation-and-stabilization-handoff-2026-03-24.md`
16. `docs/plans/maestro-speech-stabilization-master-plan-2026-03-24.md`
17. `docs/vos/asr-stage-2b-restart-packet.md` (historical context box should remain explicit)
18. `docs/vos/maestro-watchdog-audit-log.md` (historical language flags)
19. `docs/operations/asr-modernization-setup.sh` (already marked deprecated; keep synchronized)
20. `docs/maestro_minimax_project_manager_handoff.md`

---

## Tier C: Mention-Level/No-Change Unless Touched

Most docs in `guides/`, `browser/`, `operations/`, `security/`, and `ui/` are operational or UX-level and do not define category/command-lane doctrine.  
No broad rewrite required now; update only if terminology drift appears during normal edits.

---

## 3) Specific Contradiction/Gaps Found

1. `docs/speech/lane-separation-strategy.md` still lists `Parakeet-TDT` in dictation candidates and uses mixed candidate framing; this can reintroduce model-centric ambiguity.
2. `docs/speech/command-engine-hierarchy.md` currently presents Parakeet-CTC as primary engine handling 95%+ and Kaldi/Vosk as fallback; this should be reframed so command-lane governance/platform ownership is clearly Maestro/Kaldi/Vosk-class control first, with Parakeet-CTC as modernization front end.
3. `docs/strategy/market-positioning-differentiation.md` uses “Modular Voltron (CTC + Kaldi)” language that should align to command-platform ownership and operator governance phrasing.
4. `docs/strategy/talon-compatibility-migration.md` is directionally strong but should explicitly tie migration output to structured command-platform assets and governance loop.
5. `docs/vision/voice-operating-system.md` should explicitly state:
   - full-spectrum voice coverage with command authority primary
   - keyboard/mouse augmentation (not replacement)
   - separate command/dictation lanes
   - mobile as future operator console
   - software presence as first-class concept
6. `docs/vision/The_Living_Voice_Cybernetic_Maestro.md` should add a clear preface boundary:
   - internal doctrine framing
   - external VOS framing
   - “alive” as user effect, not primary market headline
7. `docs/index.md` still presents broad “voice-first control layer” wording without explicit command-lane primacy and lane split.

---

## 4) Recommended Execution Order

1. **Write new canonical memo first** (`docs/speech/command-lane-architecture-memo.md`)
2. Update **Vision trio** (`voice-operating-system`, `Living Voice`, `ai-customization-wizard`)
3. Update **Speech trio** (`lane-separation`, `command-engine-hierarchy`, `rust-hot-path-orchestration`)
4. Update **Strategy pair** (`market-positioning-differentiation`, `talon-compatibility-migration`)
5. Sync **VOS + architecture + plans + logs** (Tier B)
6. Final terminology sweep across remaining docs touched in current cycle

---

## 5) Canonical Terminology Locks (for future doc edits)

- **Category:** Voice Operating System (VOS)
- **Primary value:** governed command authority and orchestration
- **Command lane:** control system, bounded language, deterministic behavior
- **Dictation lane:** separate transcription lane
- **Parakeet-CTC:** near-term acoustic modernization candidate in command stack
- **Kaldi/Vosk-class control layer:** command-lane boundedness/customization authority
- **LLM wizard:** customization designer/maintainer, never runtime source of truth
- **Talk-back:** first-class software presence and approval/escalation loop
- **Mobile:** future operator console; platform architecture planned from day 1

