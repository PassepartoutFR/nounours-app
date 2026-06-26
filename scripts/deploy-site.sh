#!/usr/bin/env bash
# Déploie la landing (site/) sur le serveur web.
# Aucun secret ni adresse dans le dépôt : l'hôte passe par une variable d'env.
#   export DEPLOY_HOST="utilisateur@ton-serveur"
#   export DEPLOY_WEBROOT="/var/www/nounours"   # optionnel
set -euo pipefail

HOST="${DEPLOY_HOST:?définis DEPLOY_HOST=utilisateur@serveur}"
WEBROOT="${DEPLOY_WEBROOT:-/var/www/nounours}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

tar czf - -C "$DIR/site" . | ssh "$HOST" "mkdir -p '$WEBROOT' && tar xzf - -C '$WEBROOT' && chmod -R a+rX '$WEBROOT'"
echo "✅ Site déployé sur $HOST:$WEBROOT"
