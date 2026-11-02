from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[1]
s=(r/'index.html').read_text()
for block in json.loads((r/'tests/share-insertions.json').read_text()).values():
 assert s.count(block)==1
 s=s.replace(block,'',1)
b=s.encode();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()=='0fd1217215731dc8f0bded572796cddb3facea43'
assert 'location.' not in (r/'share-page.js').read_text()
print('Exact original homepage restored after only three sharing insertions; medical text and metadata preserved')
