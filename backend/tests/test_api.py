import urllib.request
import json
import urllib.error

endpoints = ['/api/users', '/api/roles', '/api/categories', '/api/asset-requests']

for ep in endpoints:
    url = f'http://localhost:8000{ep}'
    try:
        response = urllib.request.urlopen(url)
        print(f"Success {ep}:", response.getcode())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code} for {ep}: {e.read().decode()}")
    except Exception as e:
        print(f"Error for {ep}: {e}")
