#!/usr/bin/env bash
set -e

echo -e "\033[35m═══════════════════════════════════════════════════════════\033[0m"
echo -e "\033[36m  / L A U N C H  · Installing 60fps Video Engine...\033[0m"
echo -e "\033[35m═══════════════════════════════════════════════════════════\033[0m"

TARGET_DIR="$HOME/.launch-engine"
if [ -d "$TARGET_DIR" ]; then
    echo "Updating existing Launch installation..."
    cd "$TARGET_DIR"
    git pull origin main
else
    echo "Cloning Launch repository to $TARGET_DIR..."
    git clone https://github.com/SadikMohamud/Launch.git "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

echo "Installing dependencies..."
npm install --silent

echo "Registering global 'launch' command..."
npm link --force

echo -e "\n\033[32m✓ Launch Engine installed successfully!\033[0m"
echo -e "\033[32mRun 'launch --help' or 'launch https://yoursite.com' to get started.\033[0m\n"
