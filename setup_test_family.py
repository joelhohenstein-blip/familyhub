#!/usr/bin/env python3
import subprocess

# Get the user ID
result = subprocess.run(
    ['psql', '-U', 'postgres', '-h', 'localhost', 'family_hub', '-c', 
     "SELECT id FROM users WHERE email = 'testadmin@test.com';"],
    capture_output=True,
    text=True
)
print("User query result:")
print(result.stdout)

# Update user role to admin
result = subprocess.run(
    ['psql', '-U', 'postgres', '-h', 'localhost', 'family_hub', '-c', 
     "UPDATE users SET role = 'admin' WHERE email = 'testadmin@test.com';"],
    capture_output=True,
    text=True
)
print("Update result:")
print(result.stdout)

# Create a family
result = subprocess.run(
    ['psql', '-U', 'postgres', '-h', 'localhost', 'family_hub', '-c', 
     "INSERT INTO families (surname, owner_id, description) VALUES ('TestFamily', (SELECT id FROM users WHERE email = 'testadmin@test.com'), 'Test family for blur verification') RETURNING id;"],
    capture_output=True,
    text=True
)
print("Family creation result:")
print(result.stdout)
