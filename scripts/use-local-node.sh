# Run: source scripts/use-local-node.sh
# All tools and temporary files stay inside the project.
ASIA_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASIA_NODE_DIR="$ASIA_PROJECT_ROOT/.tools/node-v22.14.0-linux-x64/bin"
if [ -x "$ASIA_NODE_DIR/node" ]; then
  export PATH="$ASIA_NODE_DIR:$PATH"
fi
mkdir -p "$ASIA_PROJECT_ROOT/tmp" "$ASIA_PROJECT_ROOT/.cache"
export TMPDIR="$ASIA_PROJECT_ROOT/tmp"
export PLAYWRIGHT_BROWSERS_PATH="$ASIA_PROJECT_ROOT/.cache/ms-playwright"
export XDG_CACHE_HOME="$ASIA_PROJECT_ROOT/.cache"
