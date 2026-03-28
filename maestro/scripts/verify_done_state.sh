#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "${ROOT_DIR}/.." && pwd)"
BRANCH="$(git -C "${REPO_DIR}" rev-parse --abbrev-ref HEAD)"
UPSTREAM="$(git -C "${REPO_DIR}" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"

if [[ -z "${UPSTREAM}" ]]; then
  echo "[FAIL] No upstream tracking branch is configured for ${BRANCH}." >&2
  echo "Run: git branch --set-upstream-to origin/${BRANCH} ${BRANCH}" >&2
  exit 1
fi

echo "== Verify Done State =="
echo "repo: ${REPO_DIR}"
echo "branch: ${BRANCH}"
echo "upstream: ${UPSTREAM}"

echo
echo "== Sync Check =="
git -C "${REPO_DIR}" fetch origin "${BRANCH}" --quiet
LOCAL_SHA="$(git -C "${REPO_DIR}" rev-parse HEAD)"
REMOTE_SHA="$(git -C "${REPO_DIR}" rev-parse "${UPSTREAM}")"

echo "local:  ${LOCAL_SHA}"
echo "remote: ${REMOTE_SHA}"

if [[ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]]; then
  echo "[FAIL] Local branch is not aligned with upstream." >&2
  echo "Push pending commits or pull missing commits before marking done." >&2
  exit 1
fi

echo "[PASS] Local and remote SHAs match."

echo
echo "== Frontend Build =="
(cd "${ROOT_DIR}/client" && npm run -s build)
echo "[PASS] Frontend build succeeded."

echo
echo "== Backend Install Dist =="
(cd "${ROOT_DIR}" && ./gradlew :core:installDist client:installServer -x downloadModels)
echo "[PASS] Backend installDist + client installServer succeeded."

echo
echo "[DONE] Verified: sync check + frontend build + backend install completed."
