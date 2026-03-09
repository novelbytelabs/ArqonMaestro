# Wave E1 Inventory And Classification Matrix

This is the first executable deliverable for Wave E.

## Inventory Snapshot

- `maestro/README.md`: 1 file, heavy legacy branding and links
- `maestro/docs/*`: 7 files, all contain inherited product framing
- `maestro/web/*`: 52 files with legacy references across pages/blog/legal/download endpoints

Discovery signals:

- files with legacy references in E1 scope: `60`
- web pages scanned: `28`
- internal inherited docs scanned: `7`

## Classification Matrix

| Surface Cluster | Count | Classification | Action | Rationale |
|---|---:|---|---|---|
| `maestro/README.md` monorepo landing content | 1 | `rewrite` | Replace with Arqon Maestro framing and updated links | Active top-level surface; currently points to inherited branding/repos |
| `maestro/docs/*.md` technical inherited docs | 7 | `rewrite` | Rewrite command/product naming and environment path guidance to Arqon terms | These are active technical docs, not legal provenance |
| `maestro/web/src/pages/{index,install,download,everywhere,community,blog}.tsx` | 6 | `rewrite` | Rewrite active marketing/usage text and inherited endpoint links | Public product messaging must match current product identity |
| `maestro/web/src/pages/blog/*` historical posts | 11 | `annotate` | Keep post bodies as historical material; add provenance banner/index classification | Historical context should be preserved, not silently rewritten |
| `maestro/web/src/pages/{privacy,terms}.tsx` legal policy pages | 2 | `preserve + annotate` | Preserve legal text; add explicit historical-ownership annotation and review-needed marker | Legal/provenance accuracy requirement; no silent content rewriting |
| `maestro/web` config and metadata (`gatsby-config.js`, download URLs) | 4 | `rewrite` | Replace active site URL/title/description and inherited artifact URL assumptions or mark deferred | Active runtime/public metadata should not misstate ownership |
| External media links under `cdn.serenade.ai` in active pages | multi | `annotate/defer` | Keep temporarily with explicit dependency note until Wave D2 infra exists | Avoid broken assets while ownership migration is deferred |

## Batch Plan

### Batch E1-A (completed)

- Publish this inventory and classification matrix.
- Mark legal pages as preserve/annotate category.
- Mark blog archive as annotate category.

### Batch E1-B (completed)

- Rewrite `maestro/README.md` and `maestro/docs/*.md` into Arqon-first language.
- Keep technical behavior unchanged; documentation-only changes.
- Status: complete in this batch.

### Batch E1-C (completed)

- Rewrite active `maestro/web` product pages and metadata.
- Add historical/provenance banner component for blog/legal surfaces.
- Status: complete in this batch.

## Guardrails Applied

1. No legal text rewriting in E1.
2. No fabricated ownership claims for endpoints not yet migrated.
3. No provenance deletion without archive/annotation path.

## Exit Criteria For E1

- every in-scope surface cluster has a classification and action
- no unclassified cluster remains in `maestro/README.md`, `maestro/docs`, `maestro/web`
- Wave E matrix points to this inventory artifact

E1 is complete.
