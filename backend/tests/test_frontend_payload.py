import urllib.request
import json
import urllib.error

data = {
    "name": "Frontend Test",
    "mailid": "frontend@test.com",
    "empCode": "FE001",
    "mobile": "",
    "role": "user",
    "reportingRole": "manager",
    "reportingTo": ["Vishal"],
    "status": "Active",
    "password": "password123",
    "department": "N/A"
}
data_encoded = json.dumps(data).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/api/users', data=data_encoded, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print("Success POST:", response.getcode(), response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
