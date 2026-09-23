#!/usr/bin/env bash
#
# Launch installer for macOS and Ubuntu.
#
# The previous installer used `set -e` alone, cd'd without checking the clone
# had worked, and printed "installed successfully" whatever happened. This one
# fails loudly, never claims success it has not verified, and is safe to run
# twice.

set -euo pipefail

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

if [ -t 1 ]; then
  BOLD=$(printf '\033[1m'); DIM=$(printf '\033[2m')
  RED=$(printf '\033[31m'); GREEN=$(printf '\033[32m')
  YELLOW=$(printf '\033[33m'); RESET=$(printf '\033[0m')
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; RESET=""
fi

step() { printf '%s==>%s %s\n' "$BOLD" "$RESET" "$1"; }
info() { printf '    %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '%s !%s %s\n' "$YELLOW" "$RESET" "$1"; }
ok()   { printf '%s  ok%s %s\n' "$GREEN" "$RESET" "$1"; }

fail() {
  printf '\n%sInstall failed:%s %s\n' "$RED" "$RESET" "$1" >&2
  [ $# -gt 1 ] && printf '    %s\n' "$2" >&2
  printf '\n' >&2
  exit 1
}

# Any unexpected error lands here, so the script can never fall through to a
# success message after a failed step.
trap 'fail "An unexpected error occurred on line $LINENO." "Rerun with: bash -x install.sh"' ERR

MIN_NODE_MAJOR=22
PACKAGE="@snurm/launch"
FROM_SOURCE=0

for arg in "$@"; do
  case "$arg" in
    --from-source) FROM_SOURCE=1 ;;
    --help|-h)
      cat <<'USAGE'
Launch installer

  bash install.sh                 install the published package
  bash install.sh --from-source   install from this checkout, for development

To uninstall:

  npm uninstall -g @snurm/launch
USAGE
      exit 0
      ;;
    *) fail "Unknown option: $arg" "Run: bash install.sh --help" ;;
  esac
done

printf '\n%sLaunch%s  installing the video engine\n\n' "$BOLD" "$RESET"

# ---------------------------------------------------------------------------
# 1. Node
# ---------------------------------------------------------------------------

step "Checking Node"

command -v node >/dev/null 2>&1 || fail \
  "Node is not installed." \
  "Install Node ${MIN_NODE_MAJOR} or newer from https://nodejs.org"

NODE_VERSION=$(node --version)
NODE_MAJOR=$(printf '%s' "$NODE_VERSION" | sed 's/^v//' | cut -d. -f1)

if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node ${NODE_VERSION} is too old. Launch needs ${MIN_NODE_MAJOR} or newer." \
       "On macOS: brew install node. On Ubuntu: see https://github.com/nodesource/distributions"
fi

ok "Node ${NODE_VERSION}"

command -v npm >/dev/null 2>&1 || fail "npm is not installed." "It normally ships with Node. Reinstall Node from https://nodejs.org"

# ---------------------------------------------------------------------------
# 2. A writable npm prefix, so the install never needs sudo
# ---------------------------------------------------------------------------

step "Checking the global install location"

NPM_PREFIX=$(npm config get prefix)

# Deciding by writability rather than by path keeps this correct for nvm,
# Homebrew, asdf and a system Node, which all put the prefix in different
# places with different ownership.
if [ -w "$NPM_PREFIX/lib" ] 2>/dev/null || [ -w "$NPM_PREFIX" ] 2>/dev/null; then
  ok "Using ${NPM_PREFIX}"
else
  warn "${NPM_PREFIX} is not writable, so a global install would need sudo."
  info "Setting up a user level npm prefix instead."

  USER_PREFIX="$HOME/.npm-global"
  mkdir -p "$USER_PREFIX"
  npm config set prefix "$USER_PREFIX"
  NPM_PREFIX="$USER_PREFIX"

  # Add the new bin directory to the right shell profile. zsh is the default
  # on macOS and bash on Ubuntu, so the file differs per platform.
  case "${SHELL:-}" in
    */zsh) PROFILE="$HOME/.zshrc" ;;
    */bash) PROFILE="$HOME/.bashrc" ;;
    *) PROFILE="$HOME/.profile" ;;
  esac

  LINE='export PATH="$HOME/.npm-global/bin:$PATH"'

  # Appending twice would leave a duplicate on every run, so the line is only
  # added when it is not already there.
  if [ -f "$PROFILE" ] && grep -Fqs '.npm-global/bin' "$PROFILE"; then
    info "${PROFILE} already puts it on PATH"
  else
    printf '\n# Added by the Launch installer\n%s\n' "$LINE" >> "$PROFILE"
    ok "Added it to ${PROFILE}"
    warn "Open a new terminal, or run: source ${PROFILE}"
  fi

  export PATH="$USER_PREFIX/bin:$PATH"
fi

# ---------------------------------------------------------------------------
# 3. Install
# ---------------------------------------------------------------------------

step "Installing Launch"
info "This downloads a browser and an encoder, about 400MB in total."

if [ "$FROM_SOURCE" -eq 1 ]; then
  SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
  [ -d "$SCRIPT_DIR/packages/cli" ] || fail \
    "This does not look like a Launch checkout." \
    "Run install.sh from the repository root, or drop --from-source."

  ( cd "$SCRIPT_DIR" && npm install --no-fund --no-audit ) \
    || fail "Installing dependencies failed." "Check the output above."

  # npm link is idempotent: a second run replaces the existing link.
  ( cd "$SCRIPT_DIR/packages/cli" && npm link --force ) \
    || fail "Linking the launch command failed." "Check the output above."
else
  npm install -g --no-fund --no-audit "$PACKAGE" \
    || fail "Installing ${PACKAGE} failed." "Check the output above."
fi

ok "Installed"

# ---------------------------------------------------------------------------
# 4. Chromium
# ---------------------------------------------------------------------------

step "Installing Chromium"

if [ "$(uname -s)" = "Linux" ]; then
  # Chromium on Ubuntu needs system libraries that only root can install.
  # The prompt is explained before it appears rather than after.
  if command -v sudo >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
    warn "Chromium needs system libraries, so the next step asks for your password."
    info "It runs: npx playwright install --with-deps chromium"
  fi
  npx playwright install --with-deps chromium \
    || fail "Installing Chromium and its system libraries failed." \
            "Try it directly: npx playwright install --with-deps chromium"
else
  npx playwright install chromium \
    || fail "Installing Chromium failed." "Try it directly: npx playwright install chromium"
fi

ok "Chromium ready"

# ---------------------------------------------------------------------------
# 5. Verify
# ---------------------------------------------------------------------------

step "Checking the installation"

command -v launch >/dev/null 2>&1 || fail \
  "The launch command is not on your PATH." \
  "Open a new terminal and try again. If it is still missing, add ${NPM_PREFIX}/bin to your PATH."

# Verify that the launch on PATH is the one just installed.
#
# An older Launch, or anything else called launch, can sit earlier on PATH and
# win. Checking only that the command exists and exits zero would then report
# a successful install while every later run used the wrong program, which is
# precisely the false success this installer exists to remove.
RESOLVED=$(command -v launch)
REPORTED=$(launch --version 2>/dev/null | tr -d '[:space:]' || true)

if ! printf '%s' "$REPORTED" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  fail "A different program called 'launch' is earlier on your PATH: ${RESOLVED}" \
       "Remove or rename it, then run this installer again. The Launch you just installed is in ${NPM_PREFIX}/bin."
fi

ok "launch ${REPORTED} at ${RESOLVED}"

# doctor is the real verification. If it fails, the install is not finished,
# and saying otherwise would be the exact dishonesty this rewrite removes.
if launch doctor; then
  printf '\n%sLaunch is ready.%s\n\n' "$GREEN" "$RESET"
  printf '  Make your first film:\n'
  printf '    launch https://example.com\n\n'
  printf '  Uninstall with:\n'
  printf '    npm uninstall -g %s\n\n' "$PACKAGE"
else
  printf '\n'
  fail "Launch installed, but some checks did not pass." \
       "Fix the items listed above, then run: launch doctor"
fi
