"""Validate the reviewed PDF transcription, runtime JSON and every map ID."""
import csv, hashlib, json
from pathlib import Path
root = Path(__file__).resolve().parent.parent
expected_hash = 'fbc98446e56013382c45c92f635af89b98fab5bd2bf81efff15ab83c540b030a'
assert hashlib.sha256((root / 'Азия.pdf').read_bytes()).hexdigest() == expected_hash, 'PDF changed: review source again'
with (root / 'source/transcription.tsv').open() as f:
    rows = list(csv.reader(f, delimiter='\t'))[1:]
data = json.loads((root / 'src/data/countries.json').read_text())
keys = ['id', 'name', 'capital', 'government', 'structure', 'economy', 'colony']
assert len(data) == len(rows) == 48
assert len({c['id'] for c in data}) == len({c['name'] for c in data}) == 48
for i, (row, country) in enumerate(zip(rows, data)):
    assert [country[k] for k in keys] == row, f'Row {i + 1} differs'
    assert country['sourcePage'] == i // 16 + 1
    assert country['sourceRow'] == i % 16 + 1
    assert all(country[k] is not None and country[k] != '' for k in keys)
geo = json.loads((root / 'src/data/asia.geo.json').read_text())
mapped = {f['properties']['id'] for f in geo['features'] if f['properties']['study']}
assert mapped == {c['id'] for c in data}
assert all(f['geometry']['coordinates'] for f in geo['features'])
print('OK: PDF hash; 48 countries; 288 source cells; page/row references; 48 selectable map IDs.')
