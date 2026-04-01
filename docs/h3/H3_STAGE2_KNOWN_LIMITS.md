# H3 Stage 2 Known Limits (Non-Blocking)

- Tail-chain evidence completeness can still improve on short capture windows (`tail_capture_*`, `tail_decode_*`, `merged_transcript_emitted` may be sparse in some runs).
- Residual geometric event noise still appears under certain acoustic conditions.
- Evidence stream is improved but may still require stricter per-utterance correlation reports for audit-grade replay.
- Current close evidence is operationally sufficient; additional observability hardening is recommended in Stage 2.5.
