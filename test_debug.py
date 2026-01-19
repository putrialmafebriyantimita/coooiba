import requests
import json

# Config
BASE_URL = "http://127.0.0.1:8000"
API_URL = f"{BASE_URL}/api"

print("🔍 DEBUG TEST - MANAGE PESERTA API")
print("=" * 50)

def test_api(endpoint, method="GET", data=None):
    """Test API endpoint"""
    url = f"{API_URL}{endpoint}"
    print(f"\n🎯 Testing: {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            headers = {'Content-Type': 'application/json'}
            response = requests.post(url, json=data, headers=headers)
        
        print(f"📡 Status Code: {response.status_code}")
        print(f"📦 Response: {response.text}")
        
        # Try to parse JSON
        try:
            json_data = response.json()
            print(f"📊 JSON Data: {json.dumps(json_data, indent=2)}")
        except:
            print("❌ Response bukan JSON")
            
    except Exception as e:
        print(f"❌ Error: {e}")

# Test 1: List Peserta
print("\n1. TEST LIST PESERTA")
test_api("/list-peserta/", "GET")

# Test 2: Tambah Peserta
print("\n2. TEST TAMBAH PESERTA")
test_data = {"nama": "Putri Test Debug"}
test_api("/tambah-peserta/", "POST", test_data)

# Test 3: List lagi untuk lihat perubahan
print("\n3. TEST LIST PESERTA SETELAH TAMBAH")
test_api("/list-peserta/", "GET")

print("\n" + "=" * 50)
print("✅ DEBUG TEST SELESAI")