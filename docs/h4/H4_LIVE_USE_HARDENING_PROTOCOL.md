# H4 Live-Use Hardening Protocol

## Purpose
This protocol governs real microphone testing now that the H4 path is authoritative in development.

## Core rule
Use the system live as the real system. Do not demote it back to advisory mode merely because issues appear.

## Session protocol
1. Start from the current green `feature/h4` baseline.
2. Confirm standing static gates are green.
3. Launch Maestro normally.
4. Use a real microphone, not a simulated transcript-only path.
5. Exercise bounded command-lane utterances first:
   - reflex-style commands
   - numeric-tail commands
   - open-tail commands
   - focus-sensitive commands
6. Record whether the authority path produced a lawful final decision.
7. Record whether fallback ran.
8. Record whether the outcome matched expectation.

## What to log
For each live session, capture:
- session id
- git commit
- test date/time
- command family exercised
- authority succeeded yes/no
- fallback invoked yes/no
- fallback reason if any
- observed runtime outcome
- notes on latency / confusion / recovery

## Failure handling
If a real live session reveals a defect:
- do not broaden the stage
- do not redesign the authority stack
- isolate the smallest real defect
- patch it microscopically
- rerun standing gates
- rerun the relevant live session

## Success condition
A session counts as a success when:
- the new path remains primary
- the runtime outcome is lawful
- fallback is absent or explicit
- the behavior is explainable from the evidence chain
