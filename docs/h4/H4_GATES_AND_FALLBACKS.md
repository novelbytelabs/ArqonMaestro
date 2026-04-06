# H4 Gates and Fallbacks

## H4-S5 live-use gates

The purpose of H4-S5 is not to invent new architecture. The purpose is to run the now-authoritative system live and prove that fallback remains lawful.

### Required static gates before live sessions
1. `cd maestro/client && npx tsc --noEmit`
2. Standing H4/H3 Jest gate
3. `cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py`

### Required live-use gates
4. At least one real microphone session where the authoritative path remains primary end-to-end.
5. At least one verified fallback observation or explicit proof that fallback was not needed during the session.
6. At least one saved live-session report using the H4 session template.

## Fallback discipline
Fallback may run only if the authoritative path fails to produce a lawful final decision.

If fallback runs, the following must be recorded:
- live session id
- timestamp
- utterance or session-local description
- authority stage that failed
- fallback reason
- fallback path used
- final observed runtime outcome

## Repair rule
If live use reveals a defect:
- stop on first real defect
- isolate the smallest real failure surface
- produce a microscopic repair only
- rerun the standing gates
- rerun the relevant live-use check

## Non-goals
- no silent fallback
- no speculative broad refactors
- no UX/UI detours
