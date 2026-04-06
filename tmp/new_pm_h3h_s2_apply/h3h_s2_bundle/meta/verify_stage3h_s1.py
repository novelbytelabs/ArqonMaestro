import json, hashlib, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((root / "meta" / "bundle_manifest.json").read_text())
results = {}
for entry in manifest["files"]:
    data = (root / entry["path"]).read_bytes()
    results[entry["path"]] = {
        "bytes_match": len(data) == entry["bytes"],
        "sha256_match": hashlib.sha256(data).hexdigest() == entry["sha256"],
    }
print(json.dumps(results, indent=2, sort_keys=True))
