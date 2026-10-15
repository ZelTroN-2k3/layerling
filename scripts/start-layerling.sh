#!/bin/sh
# Starts layerling from this checkout on Linux and macOS: updates it first (when
# it is a git copy without local changes), starts the server, waits until it
# answers, and only then opens the browser. Ctrl+C stops the server again.
# The Windows counterpart is start-layerling.cmd.
self="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
cd "$(dirname "$0")/.." || exit 1
# Another port: PORT=3100 scripts/start-layerling.sh
PORT="${PORT:-3000}"
URL="http://127.0.0.1:$PORT/"

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1
  elif command -v open >/dev/null 2>&1; then
    open "$URL"
  else
    echo "Open $URL in your browser."
  fi
}

# Is layerling already running? A second server would share the build folder
# with the first and break it, and so would updating under a running server (#102).
# 0 = layerling answers on the port, 2 = something else holds it, 1 = it is free.
PORT="$PORT" node -e '
  const port = Number(process.env.PORT);
  fetch(`http://127.0.0.1:${port}/manifest.webmanifest`, { signal: AbortSignal.timeout(5000) })
    .then((response) => response.text())
    .then((text) => process.exit(text.includes("layerling") ? 0 : 2))
    .catch(() => {
      const socket = require("net").connect(port, "127.0.0.1");
      socket.on("connect", () => { socket.destroy(); process.exit(2); });
      socket.on("error", () => process.exit(1));
    });
'
case $? in
  0)
    echo "layerling is already running - opening it in the browser without a second server."
    echo "If a layerling tab is still open, you can simply keep using that one."
    open_browser
    exit 0
    ;;
  2)
    echo "Port $PORT is taken by another program, so layerling cannot start there."
    echo "Close that program, or start layerling on another port: PORT=3100 scripts/start-layerling.sh"
    exit 1
    ;;
esac

# The update can replace this very file while sh is still reading it, and sh
# would then go on at the same place in the new file (#110). So after an update
# the script starts afresh, from inside this if, which sh has read in full.
if [ -z "$LAYERLING_UPDATED" ] && [ -d .git ] && command -v git >/dev/null 2>&1; then
  # Only changed tracked files hold an update back. Files of your own in this
  # folder do not, and neither does package-lock.json: npm rewrites it when its
  # version differs from ours, so it is put back before updating.
  if [ -n "$(git status --porcelain --untracked-files=no | grep -v 'package-lock\.json$')" ]; then
    echo "These files were changed in this folder, so the update was skipped:"
    git status --short --untracked-files=no
    echo "To drop those changes and update anyway, run \"git stash\" in this folder and start layerling again."
  else
    git checkout -- package-lock.json 2>/dev/null
    echo "Checking for updates..."
    before=$(git rev-parse HEAD)
    pulled=
    git pull --ff-only --quiet && pulled=1
    if [ -z "$pulled" ]; then
      # A short gap in the network, right after the computer starts or wakes up, is
      # the usual reason: wait a moment and try once more before giving up.
      echo "The update could not be fetched - trying once more in 5 seconds..."
      sleep 5
      git pull --ff-only --quiet && pulled=1
    fi
    if [ -n "$pulled" ]; then
      if [ "$before" != "$(git rev-parse HEAD)" ]; then
        echo "layerling was updated. Installing dependencies..."
        npm install --no-save || exit 1
        LAYERLING_UPDATED=1 exec sh "$self"
      fi
    else
      echo "The update could not be fetched - check your internet connection. Continuing with the version that is already here."
    fi
  fi
fi

npm run dev -- -p "$PORT" &
server=$!
trap 'kill "$server" 2>/dev/null' INT TERM

echo "Waiting for the server to come up..."
if PORT="$PORT" node -e '
  const net = require("net");
  let tries = 0;
  const attempt = () => {
    const socket = net.connect(Number(process.env.PORT), "127.0.0.1");
    socket.on("connect", () => { socket.destroy(); process.exit(0); });
    socket.on("error", () => {
      socket.destroy();
      if (++tries >= 90) process.exit(1);
      setTimeout(attempt, 1000);
    });
  };
  attempt();
'; then
  open_browser
else
  echo "layerling did not start within 90 seconds. Look at the messages above for errors."
fi

wait "$server"
