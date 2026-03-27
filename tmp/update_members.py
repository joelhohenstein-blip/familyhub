import os
import psycopg2

db_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Update members
members = [
    ('a1a0d8ed-9e1b-498b-8349-18958829f012', 'John', 'Doe'),
    ('022d8fed-d3f3-49f2-8228-74d3019bb26d', 'Jane', 'Smith'),
    ('1c12558c-63ff-4091-8143-e92def10af3c', 'Sarah', 'Johnson'),
]

for member_id, fname, lname in members:
    cur.execute("UPDATE family_members SET first_name=%s, last_name=%s WHERE id=%s", (fname, lname, member_id))

conn.commit()

# Verify
cur.execute("SELECT first_name, last_name FROM family_members ORDER BY id")
for row in cur.fetchall():
    print(f"{row[0]} {row[1]}")

cur.close()
conn.close()
