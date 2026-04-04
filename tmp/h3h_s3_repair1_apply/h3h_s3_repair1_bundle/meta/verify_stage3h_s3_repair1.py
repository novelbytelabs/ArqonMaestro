#!/usr/bin/env python3
import hashlib, json, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'meta' / 'bundle_manifest.json').read_text())
out = {'all_match': True, 'files': []}
for entry in manifest['files']:
    p = root / entry['path']
    b = p.read_bytes()
    actual = {'path': entry['path'], 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
    match = actual['bytes'] == entry['bytes'] and actual['sha256'] == entry['sha256']
    out['files'].append({'path': entry['path'], 'match': match, **actual})
    out['all_match'] = out['all_match'] and match
print(json.dumps(out, indent=2))
sys.exit(0 if out['all_match'] else 1)
