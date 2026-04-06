import json, hashlib, pathlib, sys
base = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((base / "meta" / "bundle_manifest.json").read_text())
errors=[]
for entry in manifest["files"]:
    p = base / entry["path"]
    if not p.exists():
        errors.append({"path": entry["path"], "error": "missing"})
        continue
    data = p.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    size = len(data)
    if sha != entry["sha256"] or size != entry["bytes"]:
        errors.append({"path": entry["path"], "expected_sha256": entry["sha256"], "actual_sha256": sha, "expected_bytes": entry["bytes"], "actual_bytes": size})
print(json.dumps({"ok": not errors, "errors": errors, "file_count": len(manifest["files"])}, indent=2))
if errors:
    sys.exit(1)
