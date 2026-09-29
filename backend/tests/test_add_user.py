import urllib.request
import json
import urllib.error

data = {
    "name": "Test User",
    "mailid": "testuser@donezo.com",
    "empCode": "T123",
    "mobile": "1234567890",
    "role": "manager",
    "department": "N/A",
    "status": "Active",
    "reportingTo": None,
    "reportingRole": None,
    "password": "password123"
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
