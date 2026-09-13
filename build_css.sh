#!/bin/bash
set -e

# Fail-fast minimal Tailwind CSS production build script
# Tailwind CSS v4.3.3 CLI standalone build

TAILWIND_VERSION="v4.3.3"
TAILWIND_BIN="./tailwindcss"
TEMP_CSS="./assets/css/style.tmp.css"
FINAL_CSS="./assets/css/style.css"

echo "Setting up assets directory..."
mkdir -p assets/css

# Check if correct tailwindcss bin exists
if [ ! -f "$TAILWIND_BIN" ]; then
    echo "Downloading Tailwind Standalone CLI $TAILWIND_VERSION (Linux x64)..."
    curl -sLO "https://github.com/tailwindlabs/tailwindcss/releases/download/$TAILWIND_VERSION/tailwindcss-linux-x64"
    if [ ! -f "tailwindcss-linux-x64" ]; then
        echo "Error: Download failed."
        exit 1
    fi
    chmod +x tailwindcss-linux-x64
    mv tailwindcss-linux-x64 "$TAILWIND_BIN"
fi

if [ ! -x "$TAILWIND_BIN" ]; then
    echo "Error: Tailwind CLI executable not found or not executable."
    exit 1
fi

echo "Building production CSS..."
# Build to a temp file first to prevent overwriting a working CSS with a broken one
if ! "$TAILWIND_BIN" -i ./src/input.css -o "$TEMP_CSS" --minify; then
    echo "Error: Tailwind build failed."
    rm -f "$TEMP_CSS"
    exit 1
fi

# Ensure temp file is not empty
if [ ! -s "$TEMP_CSS" ]; then
    echo "Error: Compiled CSS file is empty."
    rm -f "$TEMP_CSS"
    exit 1
fi

mv "$TEMP_CSS" "$FINAL_CSS"

echo "Build complete. Compiled CSS is at $FINAL_CSS"
echo ""
echo "To switch to production mode, replace the CDN script in your HTML files with:"
echo '<link href="assets/css/style.css" rel="stylesheet">'
