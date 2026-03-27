import json
from datetime import datetime

with open('/workspace/drizzle/meta/_journal.json', 'r') as f:
    journal = json.load(f)

# Add the new migration entry
new_entry = {
    "idx": 10,
    "version": "7",
    "when": int(datetime.now().timestamp() * 1000),
    "tag": "0010_add_list_events",
    "breakpoints": True
}

journal['entries'].append(new_entry)

with open('/workspace/drizzle/meta/_journal.json', 'w') as f:
    json.dump(journal, f, indent=2)

print("Updated journal with new migration")
