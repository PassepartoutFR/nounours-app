#!/usr/bin/env bash
# Déploie le serveur de classement (server/server.py) et redémarre le service.
# Prérequis côté serveur : Python 3 + un service systemd "nounours-scoreboard"
# (voir deploy/nounours-scoreboard.service).
#   export DEPLOY_HOST="utilisateur@ton-serveur"
#   export SCOREBOARD_DIR="~/nounours-scoreboard"   # optionnel
set -euo pipefail

HOST="${DEPLOY_HOST:?définis DEPLOY_HOST=utilisateur@serveur}"
DEST="${SCOREBOARD_DIR:-~/nounours-scoreboard}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

cat "$DIR/server/server.py" | ssh "$HOST" "mkdir -p $DEST && cat > $DEST/server.py && python3 -m py_compile $DEST/server.py && (sudo systemctl restart nounours-scoreboard || echo 'service non installé — voir deploy/nounours-scoreboard.service')"
echo "✅ Serveur déployé sur $HOST:$DEST"
