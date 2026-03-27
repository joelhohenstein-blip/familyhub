#!/usr/bin/env node
/**
 * Clean Restart Script for React Router v7 Dev Server
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function killProcesses() {
  log(colors.yellow, '🔪 Killing dev server processes...');
  // Kill by PORT only (safe - won't kill agent which doesn't use these ports)
  // fuser with multiple ports in one call is fastest (~40ms vs 300ms+ for 12 lsof calls)
  try {
    execSync(
      `fuser -k 3000/tcp 3001/tcp 3002/tcp 3003/tcp 3004/tcp 3005/tcp 5173/tcp 2>/dev/null || true`,
      { stdio: 'ignore' }
    );
  } catch {}
  log(colors.green, '   Done');
}

function clearCaches() {
  log(colors.yellow, '🧹 Clearing caches...');
  for (const dir of ['.vite', 'node_modules/.vite', '.react-router']) {
    const fullPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }
  log(colors.green, '   Done');
}

async function main() {
  killProcesses();
  clearCaches();
  log(colors.yellow, '⏳ Waiting...');
  await new Promise(r => setTimeout(r, 1000));
  log(colors.green, '✅ Ready');
}

main().catch(console.error);
