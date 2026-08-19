#!/usr/bin/env python3
import json
from pathlib import Path

path = Path("/var/www/axon/.next/server/server-reference-manifest.json")
data = json.loads(path.read_text())
for node_id, entry in sorted(data.get("node", {}).items(), key=lambda x: x[1].get("exportedName", "")):
    name = entry.get("exportedName", "")
    if name:
        print(f"{name}\t{entry.get('id', node_id)}")
