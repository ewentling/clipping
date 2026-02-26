#!/usr/bin/env bash
# =============================================================================
# Clipnotic – Update Script
#
# Usage:  ./update.sh [--branch <name>] [--no-build] [--backup-dir <path>]
#
# Steps:
#   1. Backup current data (output clips, .env)
#   2. Pull the latest changes from GitHub
#   3. Install / update dependencies (root, backend, frontend)
#   4. Rebuild the frontend production bundle (unless --no-build)
#   5. Restart the running application
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
step()    { echo -e "\n${BOLD}==> $*${NC}"; }

# ---------------------------------------------------------------------------
# Defaults & argument parsing
# ---------------------------------------------------------------------------
BRANCH=""
NO_BUILD=false
BACKUP_BASE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --branch <name>       Git branch to pull from (default: current branch)
  --no-build            Skip the frontend production build step
  --backup-dir <path>   Directory in which to store backups
                        (default: <repo-root>/backups)
  -h, --help            Show this help message
EOF
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)      BRANCH="$2";       shift 2 ;;
    --no-build)    NO_BUILD=true;     shift   ;;
    --backup-dir)  BACKUP_BASE="$2";  shift 2 ;;
    -h|--help)     usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

if [[ -z "$BACKUP_BASE" ]]; then
  BACKUP_BASE="${SCRIPT_DIR}/backups"
fi

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
step "Pre-flight checks"

if ! command -v git &>/dev/null; then
  error "git is not installed or not in PATH."
  exit 1
fi
success "git found: $(git --version)"

if ! command -v node &>/dev/null; then
  error "Node.js is not installed or not in PATH."
  exit 1
fi
success "node found: $(node --version)"

if ! command -v npm &>/dev/null; then
  error "npm is not installed or not in PATH."
  exit 1
fi
success "npm found: $(npm --version)"

if [[ ! -f "${SCRIPT_DIR}/package.json" ]]; then
  error "package.json not found in ${SCRIPT_DIR}."
  error "Run this script from the repository root."
  exit 1
fi

cd "$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# Step 1 – Backup
# ---------------------------------------------------------------------------
step "Step 1/5 – Backing up current data"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_BASE}/${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"
info "Backup destination: ${BACKUP_DIR}"

# .env (contains secrets / runtime config – always preserve)
if [[ -f ".env" ]]; then
  cp ".env" "${BACKUP_DIR}/.env"
  success "Backed up .env"
else
  warn ".env not found – skipping"
fi

# output/ directory (generated clips)
if [[ -d "output" ]] && [[ -n "$(ls -A output 2>/dev/null)" ]]; then
  cp -r "output" "${BACKUP_DIR}/output"
  FILE_COUNT="$(find output -type f | wc -l | tr -d ' ')"
  success "Backed up output/ (${FILE_COUNT} files)"
else
  info "output/ is empty or absent – nothing to back up"
fi

# Record the current git commit so the backup is traceable
git rev-parse HEAD > "${BACKUP_DIR}/git_commit.txt" 2>/dev/null || true
success "Backup complete → ${BACKUP_DIR}"

# ---------------------------------------------------------------------------
# Step 2 – Pull latest changes from GitHub
# ---------------------------------------------------------------------------
step "Step 2/5 – Pulling latest changes from GitHub"

STASHED=false

# Stash any uncommitted local changes that would block the pull
if ! git diff --quiet || ! git diff --cached --quiet; then
  warn "Uncommitted local changes detected. Stashing before pulling..."
  git stash push -m "update.sh auto-stash ${TIMESTAMP}"
  STASHED=true
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [[ -n "$BRANCH" && "$BRANCH" != "$CURRENT_BRANCH" ]]; then
  info "Switching from '${CURRENT_BRANCH}' to '${BRANCH}'..."
  git checkout "$BRANCH"
  CURRENT_BRANCH="$BRANCH"
fi

info "Pulling origin/${CURRENT_BRANCH}..."
if ! git pull origin "$CURRENT_BRANCH"; then
  error "git pull failed. Restoring stash (if any) and aborting."
  if [[ "$STASHED" == "true" ]]; then
    git stash pop || true
  fi
  exit 1
fi
success "Repository updated to $(git rev-parse --short HEAD)"

# Restore stashed changes (best-effort; warn on conflict)
if [[ "$STASHED" == "true" ]]; then
  info "Restoring stashed local changes..."
  if ! git stash pop; then
    warn "Stash pop produced conflicts."
    warn "Resolve manually with: git stash show -p | git apply"
  fi
fi

# ---------------------------------------------------------------------------
# Step 3 – Install / update dependencies
# ---------------------------------------------------------------------------
step "Step 3/5 – Installing dependencies"

if [[ -f "package.json" ]]; then
  info "Installing root dependencies..."
  npm install --prefer-offline 2>&1 | tail -5
  success "Root dependencies installed"
fi

if [[ -f "backend/package.json" ]]; then
  info "Installing backend dependencies..."
  npm install --prefix backend --prefer-offline 2>&1 | tail -5
  success "Backend dependencies installed"
fi

if [[ -f "frontend/package.json" ]]; then
  info "Installing frontend dependencies..."
  npm install --prefix frontend --prefer-offline 2>&1 | tail -5
  success "Frontend dependencies installed"
fi

# Pin yt-dlp to a specific reviewed version instead of blindly upgrading.
# Review the changelog and update this constant after testing each new release.
YTDLP_VERSION="2026.02.21"

# Install / upgrade yt-dlp to the pinned version if pip is available
if command -v pip3 &>/dev/null; then
  info "Installing yt-dlp==${YTDLP_VERSION}..."
  pip3 install --quiet "yt-dlp==${YTDLP_VERSION}" && success "yt-dlp ${YTDLP_VERSION} installed" \
    || warn "yt-dlp install failed – continuing"
elif command -v pip &>/dev/null; then
  info "Installing yt-dlp==${YTDLP_VERSION}..."
  pip install --quiet "yt-dlp==${YTDLP_VERSION}" && success "yt-dlp ${YTDLP_VERSION} installed" \
    || warn "yt-dlp install failed – continuing"
fi

# ---------------------------------------------------------------------------
# Step 4 – Build frontend (production bundle)
# ---------------------------------------------------------------------------
step "Step 4/5 – Building frontend"

if [[ "$NO_BUILD" == "true" ]]; then
  warn "--no-build flag set; skipping frontend build"
elif [[ -f "frontend/package.json" ]]; then
  info "Running: npm run build (frontend/)"
  if CI=false npm run build --prefix frontend 2>&1; then
    success "Frontend build complete"
  else
    warn "Frontend build failed – the backend will continue to serve the previous build"
  fi
else
  warn "frontend/package.json not found – skipping build"
fi

# ---------------------------------------------------------------------------
# Step 5 – Restart the application
# ---------------------------------------------------------------------------
step "Step 5/5 – Restarting the application"

restart_with_pm2() {
  # Check for existing managed processes
  local proc_count
  proc_count="$(pm2 list 2>/dev/null | grep -c "online\|stopped\|errored" || true)"

  if [[ "$proc_count" -gt 0 ]]; then
    info "Restarting all pm2 processes..."
    pm2 restart all
  else
    warn "No pm2 processes found. Starting backend server..."
    pm2 start backend/server.js \
      --name gravityclaw-backend \
      --cwd "$SCRIPT_DIR" \
      --env production
    pm2 save
  fi
  success "pm2 processes restarted"
  pm2 list
}

restart_with_systemd() {
  local service="$1"
  info "Restarting systemd service: ${service}"
  systemctl restart "$service"
  systemctl status "$service" --no-pager -l
  success "Service '${service}' restarted"
}

restart_fallback() {
  # Try to signal a running backend process, then print manual instructions
  local BACKEND_PID
  BACKEND_PID="$(pgrep -f "node.*backend/server.js" 2>/dev/null | head -1 || true)"

  if [[ -n "$BACKEND_PID" ]]; then
    info "Sending SIGTERM to backend process (PID ${BACKEND_PID})..."
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    # Give it a moment to shut down
    sleep 2
    # Relaunch in the background, logging to a file
    LOG_FILE="${SCRIPT_DIR}/backend.log"
    nohup node "${SCRIPT_DIR}/backend/server.js" >> "$LOG_FILE" 2>&1 &
    NEW_PID=$!
    success "Backend restarted (PID ${NEW_PID}). Log: ${LOG_FILE}"
  else
    warn "Could not detect a running backend process."
    echo ""
    echo -e "${YELLOW}To start the application manually:${NC}"
    echo "  Backend:  cd backend && npm start"
    echo "  Frontend: cd frontend && npm start"
    echo "  Or use:   pm2 start backend/server.js --name gravityclaw-backend"
  fi
}

# Detect process manager
if command -v pm2 &>/dev/null && pm2 ping &>/dev/null; then
  restart_with_pm2
elif systemctl is-active --quiet gravityclaw 2>/dev/null; then
  restart_with_systemd "gravityclaw"
elif systemctl is-active --quiet gravityclaw-backend 2>/dev/null; then
  restart_with_systemd "gravityclaw-backend"
else
  restart_fallback
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}================================================="
echo -e " ✅  Clipnotic update complete!"
echo -e "=================================================${NC}"
echo ""
echo -e "  Git commit : $(git rev-parse --short HEAD)"
echo -e "  Backup     : ${BACKUP_DIR}"
echo -e "  Timestamp  : ${TIMESTAMP}"
echo ""
