import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / "meta" / "bundle_manifest.json").read_text())
results = []
all_match = True
for item in manifest["files"]:
    path = ROOT / item["path"]
    data = path.read_bytes()
    actual = {
        "path": item["path"],
        "bytes_expected": item["bytes"],
        "bytes_actual": len(data),
        "sha256_expected": item["sha256"],
        "sha256_actual": hashlib.sha256(data).hexdigest(),
    }
    actual["match"] = actual["bytes_expected"] == actual["bytes_actual"] and actual["sha256_expected"] == actual["sha256_actual"]
    all_match = all_match and actual["match"]
    results.append(actual)
print(json.dumps({"all_match": all_match, "results": results}, indent=2))
