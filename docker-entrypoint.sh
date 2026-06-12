#!/bin/sh
set -e

# If running as root, we drop privileges to the 'appuser' user to avoid Claude Code's root restrictions
if [ "$(id -u)" = "0" ]; then
    # Ensure the appuser user can access the volume mount
    mkdir -p /root/.fcc
    chown -R appuser:appuser /root/.fcc
    chmod 755 /root

    # Ensure the workspace directory is accessible if it exists
    if [ -d "/app/workspace" ]; then
        chown -R appuser:appuser /app/workspace
    fi

    # Set HOME to /root so the python app finds the existing config
    export HOME=/root

    # Execute the server as the 'appuser' user
    exec gosu appuser "$@"
fi

# If not running as root, just execute as-is
exec "$@"
