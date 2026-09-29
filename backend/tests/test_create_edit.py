import urllib.request
import json
import time

# 1. Create a user
create_data = {
    "name": "Test User",
    "mailid": "testuser@example.com",
    "empCode": "T123",
    "mobile": "1234567890",
    "role": "manager",
    "reportingRole": "md",
    "reportingTo": ["Gowtham"],
    "status": "Active",
    "password": "password123",
    "department": "N/A"
}

req_create = urllib.request.Request(
    'http://localhost:8000/api/users',
    data=json.dumps(create_data).encode('utf-8'),
    method='POST',
    headers={'Content-Type': 'application/json'}
)

try:
    response = urllib.request.urlopen(req_create)
    new_user = json.loads(response.read().decode())
    print("Created user:", new_user)
except Exception as e:
    print(f"Create Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())
    exit(1)

new_user_id = new_user['id']
print(f"New user ID is {new_user_id}")

# 2. Edit the user
edit_data = {
    "name": "Test User Edited",
    "mailid": "testuser@example.com",
    "empCode": "T123",
    "mobile": "1234567890",
    "role": "manager",
    "reportingRole": "md",
    "reportingTo": ["Gowtham"],
    "status": "Active",
    "password": "newpassword123",
    "department": "N/A"
}

req_edit = urllib.request.Request(
    f'http://localhost:8000/api/users/{new_user_id}',
    data=json.dumps(edit_data).encode('utf-8'),
    method='PUT',
    headers={'Content-Type': 'application/json'}
)

try:
    response = urllib.request.urlopen(req_edit)
    edited_user = json.loads(response.read().decode())
    print("Edited user:", edited_user)
except Exception as e:
    print(f"Edit Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())

# 3. Fetch all users to verify
req_get = urllib.request.Request('http://localhost:8000/api/users', method='GET')
try:
    response = urllib.request.urlopen(req_get)
    all_users = json.loads(response.read().decode())
    verify_user = next((u for u in all_users if u['id'] == new_user_id), None)
    print("Verified user in DB:", verify_user)
except Exception as e:
    print(f"Get Error: {e}")

