import urllib.request
import json
import urllib.error

data = json.dumps({"mailid": "admin@donezo.com", "password": "admin"}).encode('utf-8')
req = urllib.request.Request('http://localhost:8000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
