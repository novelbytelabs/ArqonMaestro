# H4 Deferred Issues Register

Title:
Arqon Maestro H4 Deferred Issues Register

Project:
`H4`

Branch:
`feature/h4`

Purpose:
Record known H4 issues that remain open at provisional freeze so the program can move forward without losing truth.

## 1. Deferred issue policy

An issue may be deferred at H4 freeze only if all of the following are true:

- the authority transition itself is already successful
- fallback behavior is explicit, logged, and reversible
- the issue does not erase the authoritative position of the new path
- the issue is recorded concretely enough to resume later

## 2. Deferred issues

### H4-D1 — Parameterized-tail / Parakeet-sidecar instability

Status:
`deferred`

Area:
parameterized live hardening

Observed behavior:

- some live parameterized runs still hit Parakeet-sidecar inference failure
- when this happens, the system falls back explicitly under H4 rules

Why deferred:

- H4 already achieved the primary authority transition
- this issue is refinement debt, not proof that H4 failed
- continued grinding here is lower priority than advancing the broader program

Resume point:

- return to the parameterized tail finalize seam
- continue narrowing Parakeet usage to parameter resolution only
- continue expanding geometric-only resolution for non-parameterized command classes where lawful

### H4-D2 — Geometric-only expansion beyond currently proven non-parameterized commands

Status:
`deferred`

Area:
geometric-only command-family expansion

Observed posture:

- doctrine and routing already support geometric-only behavior for reflex / closed-structure classes
- broader runtime rollout reached authoritative position
- additional non-parameterized command-family expansion remains refinement work

Why deferred:

- not required for H4 provisional closure
- better handled as a later refinement pass

## 3. Re-entry rule

When deferred H4 work resumes, the rules are:

- work from the latest repaired real baseline
- keep repairs microscopic
- stop on first real defect during live use
- do not reopen H4 doctrine unless evidence demands it
