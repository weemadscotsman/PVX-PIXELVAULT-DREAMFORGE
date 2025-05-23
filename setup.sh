#!/bin/bash
# .jules/setup.sh
# Boot script for Jules AI inside PVX-PIXELVAULT-DREAMFORGE repo

echo "[JULES] Booting PVX Dreamforge environment..."

# Check core versions
echo "[JULES] Node version:"
node -v

echo "[JULES] Installing dependencies..."
npm install

# Optional: confirm PostgreSQL CLI is available
echo "[JULES] Checking for PostgreSQL client..."
psql --version || echo "PostgreSQL client not found."

# Optional: environment variable echo
echo "[JULES] DATABASE_URL: ${DATABASE_URL:-not set}"

# Confirm build step works
echo "[JULES] Running build..."
npm run build || echo "[JULES] Build failed (non-fatal)"

# Start dev server briefly to confirm it boots
echo "[JULES] Checking dev server boot..."
npm run dev & sleep 5 && kill $! || echo "[JULES] Dev server exited (ok)"

# Optional: run staking DB logic
echo "[JULES] Verifying staking script..."
node check-staking-db.js || echo "[JULES] Staking DB check skipped or failed (non-fatal)"

echo "[JULES] Setup complete. Ready for audit."
