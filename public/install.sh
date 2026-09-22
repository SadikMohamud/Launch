#!/usr/bin/env bash
set -e

echo -e "\033[35m═══════════════════════════════════════════════════════════\033[0m"
echo -e "\033[36m  / L A U N C H  · Installing 60fps Video Engine...\033[0m"
echo -e "\033[35m═══════════════════════════════════════════════════════════\033[0m"

TARGET_DIR="$HOME/.launch-engine"
mkdir -p "$TARGET_DIR/bin"

echo "Downloading Launch Engine binary..."
curl -fsSL https://launch-ouzf.vercel.app/bin/launch.js -o "$TARGET_DIR/bin/launch.js"
curl -fsSL https://launch-ouzf.vercel.app/package.json -o "$TARGET_DIR/package.json"
chmod +x "$TARGET_DIR/bin/launch.js"

echo "Registering global 'launch' command..."
cd "$TARGET_DIR"
npm link --force

echo -e "\n\033[32m✓ Launch Engine installed successfully!\033[0m"
echo -e "\033[32mRun 'launch --help' or 'launch https://yoursite.com' to get started.\033[0m\n"
