import json, hashlib, pathlib
base = pathlib.Path(__file__).resolve().parent.parent
manifest = json.loads((base/'meta'/'bundle_manifest.json').read_text())
results=[]
all_match=True
for entry in manifest['files']:
    p = base/entry['path']
    b = p.read_bytes()
    actual_bytes=len(b)
    actual_sha=hashlib.sha256(b).hexdigest()
    ok = actual_bytes==entry['bytes'] and actual_sha==entry['sha256']
    all_match = all_match and ok
    results.append({'path': entry['path'], 'expected_bytes': entry['bytes'], 'actual_bytes': actual_bytes, 'expected_sha256': entry['sha256'], 'actual_sha256': actual_sha, 'match': ok})
print(json.dumps({'ALL_MATCH': all_match, 'results': results}, indent=2))
