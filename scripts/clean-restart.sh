#!/bin/bash
#
# Clean Restart Script for React Router v7 Dev Server
#
# This script:
# 1. Kills any running dev server processes
# 2. Clears build caches
# 3. Waits for filesystem to settle
# 4. Optionally starts the dev server
#
# Usage:
#   ./scripts/clean-restart.sh         # Kill + clear only
#   ./scripts/clean-restart.sh --start # Kill + clear + start

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  React Router v7 Clean Restart${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo

# Step 1: Kill dev server processes by PORT (safe - won't kill agent)
echo -e "${YELLOW}🔪 Killing dev server processes...${NC}"

# Kill by port only - this is safe because the agent doesn't listen on these ports
# fuser multi-port is fastest: ~40ms vs 300ms+ for 12 lsof calls
fuser -k 3000/tcp 3001/tcp 3002/tcp 3003/tcp 3004/tcp 3005/tcp 5173/tcp 2>/dev/null && echo -e "${CYAN}   Killed processes on dev ports${NC}" || true

# NOTE: We do NOT use pgrep/pkill to kill node/bun processes because:
# 1. It would kill the Claude agent (which is a node process)
# 2. fuser -k on dev ports already kills the dev server safely

echo -e "${GREEN}   All processes terminated${NC}"
echo

# Step 2: Clear caches
echo -e "${YELLOW}🧹 Clearing caches...${NC}"
cd "$ROOT_DIR"

CLEARED=0
for dir in ".vite" "node_modules/.vite" ".react-router" "build/.vite"; do
  if [ -d "$dir" ]; then
    rm -rf "$dir"
    echo -e "${CYAN}   Cleared: $dir${NC}"
    CLEARED=$((CLEARED + 1))
  fi
done

if [ $CLEARED -eq 0 ]; then
  echo -e "${GREEN}   No caches to clear${NC}"
else
  echo -e "${GREEN}   Cleared $CLEARED cache directories${NC}"
fi
echo

# Step 3: Wait for filesystem
echo -e "${YELLOW}⏳ Waiting for filesystem to settle...${NC}"
sleep 1
echo -e "${GREEN}   Done${NC}"
echo

# Step 4: Start dev server if --start flag
if [ "$1" = "--start" ]; then
  echo -e "${YELLOW}🚀 Starting dev server on port 3000...${NC}"

  # Detect package manager
  if [ -f "bun.lockb" ]; then
    CMD="bun"
  else
    CMD="npm"
  fi

  echo -e "${CYAN}   Using: $CMD run dev${NC}"
  HOST=0.0.0.0 $CMD run dev
else
  echo -e "${GREEN}✅ Clean restart complete!${NC}"
  echo -e "${CYAN}   Run \"bun run dev\" to start the dev server${NC}"
fi
