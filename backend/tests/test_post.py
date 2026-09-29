import urllib.request
import json
import urllib.error

data = {
    "assetType": "Laptop",
    "description": "Need a new laptop",
    "justification": "Old one broke",
    "requestedBy": 1,
    "selectedReportingTo": None
}
data_encoded = json.dumps(data).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/api/asset-requests', data=data_encoded, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print("Success POST:", response.getcode(), response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
