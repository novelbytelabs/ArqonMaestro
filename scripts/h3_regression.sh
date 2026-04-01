#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="$(pwd)/artifacts/reports/h3_regression"
mkdir -p "$OUT_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
OUT="$OUT_DIR/run_${TS}.md"

cat > "$OUT" <<MARKDOWN
# H3 Regression Run ${TS}

## Checklist
- [ ] Reflex positive: pause
- [ ] Closed-structure positive: focus chrome/new tab
- [ ] Parameterized positive: go to line fifty two
- [ ] Parameterized positive: go to wikipedia dot org
- [ ] Negative/noise case
- [ ] Near-miss non-trigger case
- [ ] H3-off safety case

## Notes
- Fill outcomes and evidence paths for each case.
MARKDOWN

echo "Created regression template: $OUT"
