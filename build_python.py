import urllib.request
import os
import stat
import subprocess

tailwind_url = "https://github.com/tailwindlabs/tailwindcss/releases/download/v4.3.3/tailwindcss-linux-x64"
tailwind_bin = "./tailwindcss"
temp_css = "./assets/css/style.tmp.css"
final_css = "./assets/css/style.css"

print("Downloading tailwindcss...")
if not os.path.exists(tailwind_bin):
    urllib.request.urlretrieve(tailwind_url, tailwind_bin)
    st = os.stat(tailwind_bin)
    os.chmod(tailwind_bin, st.st_mode | stat.S_IEXEC)

os.makedirs("assets/css", exist_ok=True)

print("Building CSS...")
try:
    subprocess.run([tailwind_bin, "-i", "./src/input.css", "-o", temp_css, "--minify"], check=True)
    if os.path.exists(temp_css) and os.path.getsize(temp_css) > 0:
        os.replace(temp_css, final_css)
        print(f"Build complete. CSS size: {os.path.getsize(final_css)} bytes")
    else:
        print("Error: CSS file is empty")
        if os.path.exists(temp_css):
            os.remove(temp_css)
except Exception as e:
    print("Build failed:", e)
    if os.path.exists(temp_css):
        os.remove(temp_css)
