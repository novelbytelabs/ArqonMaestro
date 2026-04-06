# H4 Authority Integration Map

## Purpose

Map the exact runtime surfaces that will become authoritative under H4, identify what remains fallback, and define where cutover occurs.

---

## 1. Authority target

Primary authority target for H4:

- live microphone input
- command-lane ingestion
- command-lane routing
- H3/3J authority processing
- final lawful runtime decision for the command lane

This is the first authority zone.

---

## 2. Primary authoritative path

The intended primary path in development is:

1. microphone ingress
2. chunk intake
3. command-lane routing
4. H3 evidence path
5. H3/3J authority processing:
   - discovery
   - skeleton inference
   - scoring/risk
   - rubric/promotion
   - policy/timing shaping
   - draft/library preview surfaces where relevant
6. lawful final runtime decision

This path is the one H4 is promoting to authority.

---

## 3. Fallback path

Fallback path remains available only when:

- the authoritative path fails to produce a lawful final decision

Fallback role:
- recovery only
- not primary authority
- explicit
- logged
- reversible

---

## 4. Runtime cutover boundary

The cutover boundary for H4 is the command-lane decision boundary.

Meaning:
- before cutover, the old path may still be primary
- after cutover, the H3/3J path becomes primary
- fallback is invoked only on explicit failure to produce a lawful final decision

---

## 5. Integration surfaces register

### In-scope for H4
- microphone ingress
- command-lane routing
- chunk manager authority path
- H3 runtime evidence emission
- semantic-address / focus / reuse evidence compatibility surfaces
- decision output boundary
- fallback logging boundary

### Out of scope for initial H4 authority cutover
- polished workflow UX/UI
- workflow inbox visual surfaces
- storage productization
- sharing/export UX
- end-user settings UI

---

## 6. Live microphone map

The live mic path that must be proven is:

- mic input received
- routed into command lane by default
- authority path engaged by default
- authority path either:
  - produces lawful final decision
  - or explicitly fails and invokes fallback

This is the first proof target of H4.

---

## 7. Observability map

At minimum, the following points must be visible during H4:

- mic ingress
- route chosen
- authority path engaged
- authority path success/failure
- fallback invoked yes/no
- final decision origin

---

## 8. Cutover rule

The H3/3J path should become the default primary command-lane path in development.

The old path remains:
- fallback only
- comparison only where explicitly useful
- never silent-primary after cutover

---

## 9. H4-S1 completion statement

H4-S1 is complete when this map is present, explicit, and sufficient for H4-S2 to wire the live microphone into the authority path without ambiguity.


## 10. H4-S2 completion statement

H4-S2 makes live microphone authority entry explicit in runtime evidence.

What is now true:
- live microphone chunk entry emits an explicit H4 authority-entry event
- default command-lane path selection is explicit in evidence
- fallback invocation is explicit in evidence when replay-to-endpoint recovery runs
- no silent fallback is permitted at the live mic entry seam


## H4-S3 spine cutover target

H4-S2 made live microphone authority entry explicit at runtime evidence level.
H4-S3 is the next boundary: the command-lane authority spine itself becomes explicit and primary at the decision stage.

This means the runtime must now record:
- whether the command lane remained on the H3/3J authority path through the decision stage
- whether a lawful final decision was produced by the authoritative path
- whether fallback was invoked because the authority path failed to produce a lawful final decision

The intended primary path remains:
- live mic ingress
- command-lane routing
- H3/3J authority path
- lawful final decision

Legacy behavior remains fallback only.
