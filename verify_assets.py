import os
import shutil
import urllib.request
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets', 'macs')
SOURCE_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'MACS_clean', '05_figures'))

# Mapping of original relative paths to final asset filenames
FILES_TO_COPY = [
    ('pymol_global_comparison/MACS_ph68_ph74_overlay.png', 'overlay.png'),
    ('pymol_integrated_mechanism/MACS_PyMOL_integrated_mechanism_6panel_FINAL.png', 'integrated-mechanism.png'),
    ('pymol_histidine_network/MACS_histidine_network_overlay_clean.png', 'histidine-network.png'),
    ('dccm_cluster/dccm_difference_ph68_minus_ph74.png', 'dccm-difference.png'),
    ('sensor_exposure/MACS_key_chemical_switches_full300_10ns_clean.png', 'sensor-exposure.png')
]

def setup_assets():
    print(f"Creating directory: {ASSETS_DIR}")
    os.makedirs(ASSETS_DIR, exist_ok=True)
    
    for src_rel, dest_name in FILES_TO_COPY:
        src_path = os.path.join(SOURCE_DIR, src_rel)
        dest_path = os.path.join(ASSETS_DIR, dest_name)
        if os.path.exists(src_path):
            size = os.path.getsize(src_path)
            print(f"Copying {dest_name} ({size} bytes) from {src_rel}...")
            shutil.copy2(src_path, dest_path)
        else:
            print(f"ERROR: Source file not found: {src_path}")

def test_urls():
    urls_to_test = [
        f"http://localhost:{PORT}/index.html",
        f"http://localhost:{PORT}/macs-project.html",
        f"http://localhost:{PORT}/assets/macs/overlay.png",
        f"http://localhost:{PORT}/assets/macs/integrated-mechanism.png",
        f"http://localhost:{PORT}/assets/macs/histidine-network.png",
        f"http://localhost:{PORT}/assets/macs/dccm-difference.png",
        f"http://localhost:{PORT}/assets/macs/sensor-exposure.png"
    ]
    
    print("\nStarting HTTP tests...")
    all_passed = True
    for url in urls_to_test:
        try:
            req = urllib.request.Request(url, method='HEAD')
            with urllib.request.urlopen(req) as response:
                status = response.status
                content_type = response.getheader('Content-Type')
                print(f"[OK] {status} - {url} (Type: {content_type})")
        except urllib.error.HTTPError as e:
            print(f"[FAIL] {e.code} - {url}")
            all_passed = False
        except Exception as e:
            print(f"[FAIL] Error - {url} ({str(e)})")
            all_passed = False
    
    return all_passed

def run_server():
    server = HTTPServer(('', PORT), SimpleHTTPRequestHandler)
    thread = threading.Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()
    return server

if __name__ == '__main__':
    print("--- 1. Setting up assets ---")
    setup_assets()
    
    print("\n--- 2. Starting local server on port 8000 ---")
    os.chdir(BASE_DIR)
    server = run_server()
    time.sleep(1) # Wait for server to bind and start
    
    print("\n--- 3. Running tests ---")
    success = test_urls()
    
    server.shutdown()
    
    print("\n--- Summary ---")
    if success:
        print("All local file operations and HTTP checks passed successfully!")
    else:
        print("Some checks failed. Please review the output above.")
