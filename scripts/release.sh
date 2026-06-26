#!/usr/bin/env bash
# Bump la version (manifest.json) + commit + tag + push -> déclenche la CI.
# Usage : scripts/release.sh 0.5.1
set -euo pipefail

V="${1:?usage: scripts/release.sh X.Y.Z}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

# patch chirurgical de la version dans manifest.json (pas de reformatage)
node -e "const fs=require('fs');const f='$DIR/manifest.json';let s=fs.readFileSync(f,'utf8');s=s.replace(/(\"version\":\s*\")[^\"]*(\")/,'\$1$V\$2');fs.writeFileSync(f,s)"

git -C "$DIR" add manifest.json
git -C "$DIR" commit -m "Release v$V"
git -C "$DIR" tag "v$V"
git -C "$DIR" push
git -C "$DIR" push origin "v$V"

echo "✅ v$V poussé. La CI build le zip, crée la Release et publie (si secrets configurés)."
