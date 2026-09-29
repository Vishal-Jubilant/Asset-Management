import urllib.request

try:
    response = urllib.request.urlopen('http://localhost:8000/api/asset-requests', timeout=2)
    print(response.read().decode())
except Exception as e:
    print(f"Error: {e}")
