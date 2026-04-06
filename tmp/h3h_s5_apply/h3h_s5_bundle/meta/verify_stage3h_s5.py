#!/usr/bin/env python3
from pathlib import Path
import hashlib, json
root = Path(__file__).resolve().parent.parent
manifest = json.loads((root/'meta'/'bundle_manifest.json').read_text())
results=[]
all_match=True
for entry in manifest['files']:
    p = root / entry['path']
    data = p.read_bytes()
    actual = {'path': entry['path'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    match = actual['bytes']==entry['bytes'] and actual['sha256']==entry['sha256']
    all_match = all_match and match
    results.append({'path': entry['path'], 'expected': {'bytes': entry['bytes'], 'sha256': entry['sha256']}, 'actual': actual, 'match': match})
print(json.dumps({'ALL_MATCH': all_match, 'files': results}, indent=2))
