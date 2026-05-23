#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Building Aperio for macOS..."
npm ci
npm run tauri build

echo ""
echo "Build complete. Artifacts:"
find src-tauri/target/release/bundle -maxdepth 3 -type f \( -name "*.dmg" -o -name "*.app" \) 2>/dev/null || true
