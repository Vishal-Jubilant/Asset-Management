import urllib.request
import json

data = {
    "name": "Vishal Edited",
    "mailid": "vdj716@gmail.com",
    "empCode": "641664",
    "mobile": "1234567890",
    "role": "manager",
    "reportingRole": "md",
    "reportingTo": ["Gowtham"],
    "status": "Active",
    "password": "password123",
    "department": "N/A"
}

req = urllib.request.Request(
    'http://localhost:8000/api/users/2',
    data=json.dumps(data).encode('utf-8'),
    method='PUT',
    headers={'Content-Type': 'application/json'}
)

try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read().decode())
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())
