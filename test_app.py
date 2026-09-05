import requests
import json
import sys

BASE_URL = "http://localhost:8085"

def test_api():
    print("=" * 60)
    print("RUNNING COMPREHENSIVE WORLD IPTV API VERIFICATION")
    print("=" * 60)

    tests_passed = 0
    total_tests = 0

    # 1. Health Check
    total_tests += 1
    print("\n1. Testing GET /api/health ...")
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("status") == "online", "Status should be online"
        print(f"   [PASS] Health API online! Total channels: {data.get('total_channels')}")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] Health check failed: {e}")

    # 2. Get Channels List
    total_tests += 1
    print("\n2. Testing GET /api/channels ...")
    try:
        r = requests.get(f"{BASE_URL}/api/channels", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        channels = r.json()
        assert isinstance(channels, list) and len(channels) > 0, "Channels array should not be empty"
        ch = channels[0]
        assert "name" in ch and "stream_url" in ch and "country" in ch, "Channel object missing required fields"
        print(f"   [PASS] Channels API working! Returned {len(channels)} channels.")
        print(f"   Sample Channel: '{ch['name']}' ({ch['country']} | {ch['category']})")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] GET /api/channels failed: {e}")

    # 3. Get Featured Channels
    total_tests += 1
    print("\n3. Testing GET /api/channels/featured ...")
    try:
        r = requests.get(f"{BASE_URL}/api/channels/featured", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        featured = r.json()
        assert len(featured) > 0, "Featured channels array should not be empty"
        print(f"   [PASS] Featured Channels API working! Returned {len(featured)} featured channels.")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] GET /api/channels/featured failed: {e}")

    # 4. Get Single Channel Detail
    total_tests += 1
    print("\n4. Testing GET /api/channels/{id} ...")
    try:
        ch_id = channels[0]['id']
        r = requests.get(f"{BASE_URL}/api/channels/{ch_id}", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        ch_detail = r.json()
        assert ch_detail['id'] == ch_id, "Channel ID mismatch"
        print(f"   [PASS] Single Channel API working for ID {ch_id} ('{ch_detail['name']}')")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] GET /api/channels/id failed: {e}")

    # 5. Get Countries List
    total_tests += 1
    print("\n5. Testing GET /api/countries ...")
    try:
        r = requests.get(f"{BASE_URL}/api/countries", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        countries = r.json()
        assert len(countries) > 0, "Countries list should not be empty"
        top_c = countries[0]['name']
        print(f"   [PASS] Countries API working! Returned {len(countries)} countries (Top: {top_c})")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] GET /api/countries failed: {e}")

    # 6. Get Categories List
    total_tests += 1
    print("\n6. Testing GET /api/categories ...")
    try:
        r = requests.get(f"{BASE_URL}/api/categories", timeout=5)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        categories = r.json()
        assert len(categories) > 0, "Categories list should not be empty"
        print(f"   [PASS] Categories API working! Returned {len(categories)} categories.")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] GET /api/categories failed: {e}")

    # 7. Search External Third-Party APIs
    total_tests += 1
    print("\n7. Testing GET /api/external/search ...")
    try:
        r = requests.get(f"{BASE_URL}/api/external/search?limit=10", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        print(f"   [PASS] External Third-Party API Search working! Provider: {data.get('provider')} ({data.get('count')} live streams found)")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] GET /api/external/search failed: {e}")

    # 8. Import M3U Playlist
    total_tests += 1
    print("\n8. Testing POST /api/playlists/import ...")
    try:
        m3u_sample = '#EXTINF:-1 tvg-name="Test HD Channel" tvg-logo="https://example.com/logo.png" group-title="News",Test HD Channel\nhttps://example.com/stream.m3u8'
        r = requests.post(f"{BASE_URL}/api/playlists/import", json={"name": "Test Suite Playlist", "content": m3u_sample}, timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        res = r.json()
        assert res.get("status") == "success", "Import status should be success"
        print(f"   [PASS] M3U Playlist Import API working! Result: {res.get('message')}")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] POST /api/playlists/import failed: {e}")

    print("\n" + "=" * 60)
    print(f"VERIFICATION COMPLETE: {tests_passed}/{total_tests} API TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

    if tests_passed == total_tests:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    test_api()
