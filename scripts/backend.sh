#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-$HOME/.local/opt/jdk21}"
export PATH="$JAVA_HOME/bin:$HOME/.local/opt/maven/bin:$PATH"

if [ -f "$ROOT/backend/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/backend/.env.local"
  set +a
fi

exec mvn -f "$ROOT/backend/pom.xml" "$@"
